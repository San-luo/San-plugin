import puppeteer from 'puppeteer';
import * as tool from '../models/tool.js';
export class medals extends plugin {
    constructor () {
      super({
        name: 'name',
        dsc: 'text',
        event: 'message',//发出提示信息
        priority: '50',//优先级
        rule: [
            { 
          reg: '^#text$',
          fnc: 'text'
          // 执行方法
            },
            { 
                reg: '^#截图$',
                fnc: 'screenshot'
                // 执行方法
                  },    
    
    ]
      })
  
    }
    async text (e) {
        e.reply(1+process.cwd())
        e.reply(`${tool.masterQQ()}`)

        


    };
    async screenshot (e){
        (async () => {
            // 启动浏览器
            const browser = await puppeteer.launch();
            // 新建一个页面
            const page = await browser.newPage();
            // 设置页面大小
            await page.setViewport({ width: 1920, height: 1080 });
            // 打开HTML文件
            await page.goto('D:/why/Bot/Miao-Yunzai/plugins/San-plugin/resources/html/box.html', { waitUntil: 'networkidle0' });
            // 将页面渲染为图片并保存到本地
            await page.screenshot({ path: 'output.png', fullPage: true });
            // 关闭浏览器
            await browser.close();
          })();
          e.reply(segment.image('./output.png'))


    }
  }