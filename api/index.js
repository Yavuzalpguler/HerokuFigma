const express = require('express');
const axios = require('axios');

const app = express();

const PORT = process.env.PORT || 3001;
const FIGMA_TOKEN = 'figd_c9JSlTAT36tlz4ISYb4nqGsQYbMXTMZcUofatJbb';
const FILE_ID = 'knilXMzyrSgkpQsGTDtSGm';

app.get('/', (req, res) => res.send('Express on Vercel'));

app.post('/designs', async (req, res) => {
  try {
    const { screenWidth = 400, screenHeight = 900 } = req.query;

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
      'Screens 📱',
      'Profile screen',
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
          if (canvas.name == screenName) {
            const components = extractComponents(
              canvas,
              canvas.absoluteBoundingBox.width,
              canvas.absoluteBoundingBox.height,
              screenWidth,
              screenHeight
            );
            return [
              {
                data: {
                  elements: components
                }
              }
            ];
          }
        }
      }
    }
  }

  return { error: screenName + ' in' + pageName + ' not found' };
};

const extractComponents = (
  node,
  figmaCanvasWidth,
  figmaCanvasHeight,
  screenWidth,
  screenHeight
) => {
  if (node.children) {
    const components = node.children.map(child => ({
      type: child.type.toLowerCase(),
      attribute: {
        x: (
          (child.absoluteBoundingBox.x / figmaCanvasWidth) *
          screenWidth
        ).toFixed(2),
        y: (
          (child.absoluteBoundingBox.y / figmaCanvasHeight) *
          screenHeight
        ).toFixed(2),
        width: (
          (child.absoluteBoundingBox.width / figmaCanvasWidth) *
          screenWidth
        ).toFixed(2),
        height: (
          (child.absoluteBoundingBox.height / figmaCanvasHeight) *
          screenHeight
        ).toFixed(2)
      }
    }));
    return components;
  }
  return [];
};

app.listen(PORT, () => console.log('Server ready on port', PORT));

module.exports = app;
