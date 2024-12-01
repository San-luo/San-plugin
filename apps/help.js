import * as tool from '../models/tool.js';
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import url from 'url'
export class San_Help extends plugin {
    constructor () {
      super({
        name: 'San_Help',
        dsc: '获取San插件帮助',
        event: 'message',//发出提示信息
        priority: 10,//优先级
        rule: [
            { 
          reg: '^#?(散|san|San|san插件|San插件|散插件)(帮助|功能|help)$',
          fnc: 'help'   // 执行方法
            }   
    ]
      })
  
    }


async help(e) {
    const filepath = path.resolve('./plugins/San-plugin/resources/html/index.html');
    const html_path = url.pathToFileURL(filepath).href;
    
    // 启动浏览器
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();

    // 设置初始视口大小，确保页面加载时有足够的空间展示所有内容
    await page.setViewport({ width: 1080, height: 1920 });

    // 加载HTML文件
    await page.goto(html_path, { waitUntil: 'networkidle2' });

    // 获取大方框元素
    const container = await page.$('.container');

    // 重新设置视口大小，确保背景图片完整显示
    await page.setViewport({ width: await page.evaluate(() => document.body.scrollWidth), 
                            height: await page.evaluate(() => document.body.scrollHeight) });

    // 再次获取大方框的边界框，因为视口变化可能会影响元素位置
    const boundingBox = await container.boundingBox();

    // 如果大方框不存在，则记录错误并退出
    if (!boundingBox) {
        logger.error('未能找到大方框元素');
        await browser.close();
        return;
    }

    // 计算截图区域，包括大方框周围的一些背景图
    const padding = 100; // 周围背景图的额外空间
    await page.screenshot({ 
        path: "./plugins/San-plugin/resources/img/help.jpeg",
        clip: { 
            x: Math.max(0, boundingBox.x - padding), // 防止负数坐标
            y: Math.max(0, boundingBox.y - padding),
            width: boundingBox.width ,
            height: boundingBox.height + padding * 2
        }, 
        type: 'jpeg', 
        quality: 100 
    });

    // 关闭浏览器前发送图片
    await e.reply(segment.image("./plugins/San-plugin/resources/img/help.jpeg"));

    // 异步删除文件
    try {
        await fs.promises.unlink("./plugins/San-plugin/resources/img/help.jpeg");
    } catch (err) {
        logger.error(`——————San-plugin报错————`);
        logger.error(err);
    }

    // 关闭浏览器
    await browser.close();
}
}
