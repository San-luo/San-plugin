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
        // 设置页面大小
        await page.setViewport({ width: 800, height: 1000 });

        // 打开HTML文件
        await page.goto(htmlPath);

        // 获取特定容器的边界
        const containerElement = await page.$('.container'); //地区名称
        const boundingBox = await containerElement.boundingBox();

        const clip = {
            x: boundingBox.x - 20,
            y: boundingBox.y ,
            width: boundingBox.width + 40,
            height: boundingBox.height + 40,
        };

        // 将页面渲染为图片并保存到本地
        const screenshotOptions = {
            clip,
            encoding: 'base64',
            type: 'jpeg',
            quality: Set_Quality, // 设置图片质量范围是1到100
        };
        const screenshot = await page.screenshot(screenshotOptions);

        // 发送图片
        e.reply(segment.image(`base64://${screenshot}`));
    }
    
}
