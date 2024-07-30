const express = require('express');
const axios = require('axios');

const app = express();

const PORT = process.env.PORT || 3001;

app.use(express.json());

app.get('/', (req, res) => res.send('Express on Vercel'));

app.post('/designs', async (req, res) => {
  try {
    const {
      figmaToken,
      fileID,
      pageName,
      screenName,
      screenWidth = 400,
      screenHeight = 900
    } = req.body;

    const response = await axios.get(
      `https://api.figma.com/v1/files/${fileID}`,
      {
        headers: {
          'X-Figma-Token': figmaToken
        }
      }
    );

    const designData = response.data;
    const profileScreenData = getProfileScreenData(
      designData,
      pageName,
      screenName,
      screenWidth,
      screenHeight
    );

    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(profileScreenData, null, 2));
  } catch (error) {
    console.error('Error fetching Figma designs:', error);
    res.status(500).send('Error fetching Figma designs');
  }
});

const getProfileScreenData = (
  designData,
  pageName,
  screenName,
  screenWidth,
  screenHeight
) => {
  const document = designData.document;
  const pages = document.children;

  for (const page of pages) {
    if (page.children) {
      if (page.name === pageName) {
        for (const canvas of page.children) {
          if (canvas.name === screenName) {
            const canvasX = canvas.absoluteBoundingBox.x;
            const canvasY = canvas.absoluteBoundingBox.y;

            const components = extractComponents(
              canvas,
              canvas.absoluteBoundingBox.width,
              canvas.absoluteBoundingBox.height,
              screenWidth,
              screenHeight,
              canvasX,
              canvasY
            );

            return formatComponents(components);
          }
        }
      }
    }
  }

  return { error: `${screenName} in ${pageName} not found` };
};

const extractComponents = (
  node,
  figmaCanvasWidth,
  figmaCanvasHeight,
  screenWidth,
  screenHeight,
  canvasX,
  canvasY
) => {
  if (node.children) {
    const components = node.children.map(child => ({
      name: child.name,
      type: classifyComponentType(child),
      attributes: {
        x: parseFloat(
          (
            ((child.absoluteBoundingBox.x - canvasX) / figmaCanvasWidth) *
            screenWidth
          ).toFixed(2)
        ),
        y: parseFloat(
          (
            ((child.absoluteBoundingBox.y - canvasY) / figmaCanvasHeight) *
            screenHeight
          ).toFixed(2)
        ),
        width: parseFloat(
          (
            (child.absoluteBoundingBox.width / figmaCanvasWidth) *
            screenWidth
          ).toFixed(2)
        ),
        height: parseFloat(
          (
            (child.absoluteBoundingBox.height / figmaCanvasHeight) *
            screenHeight
          ).toFixed(2)
        )
      },
      data: child.characters || null,
      src: child.image || 'source',
      children: extractComponents(
        child,
        figmaCanvasWidth,
        figmaCanvasHeight,
        screenWidth,
        screenHeight,
        canvasX,
        canvasY
      )
    }));
    return components;
  }
  return [];
};

const classifyComponentType = node => {
  if (node.type === 'TEXT') {
    return 'text';
  }

  if (node.children && node.children.length > 0) {
    return 'container';
  }

  if (
    node.type === 'VECTOR' ||
    node.type === 'BOOLEAN_OPERATION' ||
    node.type === 'STAR' ||
    node.type === 'LINE'
  ) {
    return 'icon';
  }
  if (node.styles && (node.styles.fill || node.styles.stroke)) {
    return 'icon';
  }
  return 'view';
};

const formatComponents = components => {
  const formattedComponents = {};
  components.forEach(component => {
    const formattedComponent = {
      type: component.type.toLowerCase(),
      layout_constraints: {
        x: component.attributes.x,
        y: component.attributes.y,
        w: component.attributes.width,
        h: component.attributes.height
      }
    };

    if (component.type === 'text' && component.data) {
      formattedComponent.data = component.data;
    } else if (component.type === 'icon' && component.src) {
      formattedComponent.src = component.src;
    } else if (component.type === 'icon' && !component.src) {
      formattedComponent.src = 'source';
    }

    if (component.children && component.children.length > 0) {
      formattedComponent.children = formatComponents(component.children);
    }

    formattedComponents[component.name.toLowerCase()] = formattedComponent;
  });
  return formattedComponents;
};

app.listen(PORT, () => console.log('Server ready on port', PORT));

module.exports = app;
