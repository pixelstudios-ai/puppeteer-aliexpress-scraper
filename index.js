const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const app = express();
app.use(express.json());

app.post('/scrape', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Missing URL' });

  try {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    const title = await page.title();
    const imageUrls = await page.$$eval('img', imgs =>
      imgs.map(img => img.src).filter(src => src.startsWith('http')).slice(0, 5)
    );

    const description = await page.$eval('body', el => el.innerText.slice(0, 1000));

    await browser.close();

    res.json({ title, description, image_urls: imageUrls });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Scraping failed' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on port ${PORT}`));
