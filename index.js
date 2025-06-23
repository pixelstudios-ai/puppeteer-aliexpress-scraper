const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const axios = require('axios');

puppeteer.use(StealthPlugin());

const app = express();
app.use(express.json());

// 🔗 Your n8n webhook URL here:
const N8N_WEBHOOK_URL = 'https://pixel-studios-ai.app.n8n.cloud/webhook-test/receive-product-data'; // 🔁 Replace this!

app.post('/scrape', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Missing AliExpress URL' });

  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    const title = await page.title();

    const imageUrls = await page.$$eval('img', imgs =>
      imgs.map(img => img.src).filter(src =>
        src.startsWith('http') && (src.endsWith('.jpg') || src.endsWith('.png'))
      )
    );

    const description = await page.$eval('body', el =>
      el.innerText.slice(0, 1000)
    );

    await browser.close();

    // Send to n8n
    await axios.post(N8N_WEBHOOK_URL, {
      title,
      description,
      image_urls: imageUrls.slice(0, 5)
    });

    return res.json({
      status: 'success',
      message: 'Scraped data sent to n8n',
      data: {
        title,
        description,
        image_urls: imageUrls.slice(0, 5)
      }
    });
  } catch (err) {
    console.error('Scraping error:', err);
    return res.status(500).json({ error: 'Scraping failed' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
