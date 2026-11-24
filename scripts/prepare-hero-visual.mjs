import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1000, height: 1200 } });
  
  const refPath = 'C:/Users/sam20/.gemini/antigravity/brain/3959eb86-84a5-4de8-8c0d-1d26707e49f2/.user_uploaded/media_1795441844080_64819ee7.jpg';
  const imgBase64 = fs.readFileSync(refPath).toString('base64');
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head><style>body { margin:0; background: transparent; }</style></head>
    <body>
      <canvas id="out"></canvas>
      <script>
        const img = new Image();
        img.src = 'data:image/jpeg;base64,${imgBase64}';
        img.onload = () => {
          const cropX = 0;
          const cropY = 110;
          const cropW = 350; // Cropping before the letters start!
          const cropH = 650;
          
          const canvas = document.getElementById('out');
          canvas.width = cropW;
          canvas.height = cropH;
          const ctx = canvas.getContext('2d');
          
          // Draw image
          ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
          
          // Smooth feather on the right edge so it blends seamlessly into the hero background
          const grad = ctx.createLinearGradient(250, 0, cropW, 0);
          grad.addColorStop(0, 'rgba(250, 245, 242, 0)');
          grad.addColorStop(0.5, 'rgba(250, 245, 242, 0.45)');
          grad.addColorStop(0.85, 'rgba(250, 245, 242, 0.9)');
          grad.addColorStop(1, 'rgba(250, 245, 242, 1)');
          
          ctx.fillStyle = grad;
          ctx.fillRect(250, 0, cropW - 250, cropH);
          
          // Soft fade at top edge
          const topGrad = ctx.createLinearGradient(0, 0, 0, 40);
          topGrad.addColorStop(0, 'rgba(250, 245, 242, 1)');
          topGrad.addColorStop(1, 'rgba(250, 245, 242, 0)');
          ctx.fillStyle = topGrad;
          ctx.fillRect(0, 0, cropW, 40);
          
          // Soft fade at bottom edge
          const btmGrad = ctx.createLinearGradient(0, cropH - 45, 0, cropH);
          btmGrad.addColorStop(0, 'rgba(250, 245, 242, 0)');
          btmGrad.addColorStop(1, 'rgba(250, 245, 242, 1)');
          ctx.fillStyle = btmGrad;
          ctx.fillRect(0, cropH - 45, cropW, 45);
          
          window._done = true;
        };
      </script>
    </body>
    </html>
  `;
  
  await page.setContent(html);
  await page.waitForFunction(() => window._done === true);
  
  const canvasEl = await page.$('#out');
  const buffer = await canvasEl.screenshot({ type: 'png', omitBackground: false });
  
  const targetDir = 'C:/Users/sam20/j-spa/apps/customer/assets/images';
  fs.writeFileSync(path.join(targetDir, 'hero-reference-sanctuary.png'), buffer);
  fs.writeFileSync('C:/Users/sam20/.gemini/antigravity/brain/3959eb86-84a5-4de8-8c0d-1d26707e49f2/clean_hero_visual.png', buffer);
  
  console.log('Saved perfect clean visual');
  await browser.close();
})();
