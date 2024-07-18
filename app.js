const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;
const iosScreenWidth = 400;
const iosScreenHeight = 900;
const FIGMA_TOKEN = 'figd_c9JSlTAT36tlz4ISYb4nqGsQYbMXTMZcUofatJbb';
const FILE_ID = 'knilXMzyrSgkpQsGTDtSGm';

app.get('/designs', async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.figma.com/v1/files/${FILE_ID}`,
      {
        headers: {
          'X-Figma-Token': FIGMA_TOKEN
        }
      }
    );

    const designData = response.data;
    const profileScreenData = getProfileScreenData(
      designData,
      'Profile screen',
      iosScreenWidth,
      iosScreenHeight
    );

    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(profileScreenData, null, 2)); // Format JSON with 2-space indentation
  } catch (error) {
    console.error('Error fetching Figma designs:', error);
    res.status(500).send('Error fetching Figma designs');
  }
});

const getProfileScreenData = (
  designData,
  screenName,
  iosScreenWidth,
  iosScreenHeight
) => {
  const document = designData.document;
  const pages = document.children;

  for (const page of pages) {
    if (page.children) {
      if (page.name === 'Screens 📱') {
        for (const canvas of page.children) {
          console.log(canvas.name);
          if (canvas.name == 'Profile screen') {
            const components = extractComponents(
              canvas,
              canvas.absoluteBoundingBox.width,
              canvas.absoluteBoundingBox.height,
              iosScreenWidth,
              iosScreenHeight
            );
            console.log(
              canvas.absoluteBoundingBox.width,
              canvas.absoluteBoundingBox.height
            );
            return components;
          }
        }
      }
    }
  }

  return { error: 'Profile screen not found' };
};

const extractComponents = (
  node,
  figmaCanvasWidth,
  figmaCanvasHeight,
  iosScreenWidth,
  iosScreenHeight
) => {
  if (node.children) {
    const components = node.children.map(child => ({
      name: child.name,
      x: (child.absoluteBoundingBox.x / figmaCanvasWidth) * iosScreenWidth,
      y: (child.absoluteBoundingBox.y / figmaCanvasHeight) * iosScreenHeight,
      width:
        (child.absoluteBoundingBox.width / figmaCanvasWidth) * iosScreenWidth,
      height:
        (child.absoluteBoundingBox.height / figmaCanvasHeight) * iosScreenHeight
      // You can add more properties as needed
    }));
    return components;
  }
  return [];
};

const findNodeByName = (nodes, name) => {
  for (let node of nodes) {
    if (node.name === name) {
      return node;
    }
    if (node.children) {
      const found = findNodeByName(node.children, name);
      if (found) {
        return found;
      }
    }
  }
  return null;
};

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
