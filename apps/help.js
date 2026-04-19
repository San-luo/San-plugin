import path from 'path';
import url from 'url'
import * as tool from '../models/tool.js';
import { getBrowserInstance } from '../models/puppeteer.js';

const Set_Quality = await tool.set_otherCfg(`imgQuality`);

export class gete extends plugin {
    constructor() {
        super({
            name: 'San_help',
            dsc: 'San-plugin帮助',
            event: 'message',
            priority: -100,
            rule: [
                {
                    reg: '^#?(散|san|San|san插件|San插件|散插件)(帮助|功能|help)$', 
                    fnc: 'help'
                }
            ]
        }); 
    }

    async help(e){
        const filepath = path.resolve('./plugins/San-plugin/resources/html/index.html');
        const htmlPath = url.pathToFileURL(filepath).href;
        
        // 启动浏览器
        const browser = await getBrowserInstance();
        // 新建一个页面
        const page = await browser.newPage();
        
        /**
         * 修改点 1：增大 Viewport 宽度
         * 之前是 800，会导致 3 列布局在媒体查询下退化为 2 列甚至 1 列，从而使页面变长。
         * 设置为 1280 可以完美承载 1200px 的容器，让每行 3 个指令生效。
         */
        await page.setViewport({
             width: 1280, 
             height: 2000, // 高度可以先给大，之后会根据 boundingBox 裁剪
             deviceScaleFactor: 2, 
        });

        // 打开HTML文件
        await page.goto(htmlPath);

        // 等待内容渲染完成
        await page.waitForSelector('.container');

        // 获取特定容器的边界
        const containerElement = await page.$('.container');
        const boundingBox = await containerElement.boundingBox();

        /**
         * 修改点 2：优化裁剪区域
         * 适当调整外边距，确保美观的同时不留过多空白。
         */
        const clip = {
            x: boundingBox.x - 10,
            y: boundingBox.y - 10,
            width: boundingBox.width + 20,
            height: boundingBox.height + 20,
        };

        // 将页面渲染为图片并保存
        const screenshotOptions = {
            clip,
            encoding: 'base64',
            type: 'jpeg',
            quality: await tool.set_otherCfg(`imgQuality`), 
        };
        
        const screenshot = await page.screenshot(screenshotOptions);

        // 关闭页面避免内存泄漏
        await page.close();

        // 发送图片
        e.reply(segment.image(`base64://${screenshot}`));
    }
}