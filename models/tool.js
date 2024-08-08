import yaml from 'js-yaml';
import fs from 'fs';
import puppeteer from 'puppeteer';

/**
 * 获取主人qq号
 * 返回number 类型
 */
export function masterQQ(){
    // 读取YAML文件
    const fileContents = fs.readFileSync('./config/config/other.yaml', 'utf8');
    // 将YAML内容解析为JavaScript对象
    const data = yaml.load(fileContents);
    // 获取键的值
    const keyValue = data.masterQQ; 
    // 转换为字符串类型 
    const masterqq = keyValue[0]
    //.toString()
    //返回主人QQ号
    return masterqq
}

/**
 * 截图并发送
 * @param e 传入事件对象e
 * @param gopath 截图的html文件或网址URL
 * @param outpath 图片生成路径,可选
 */
export async function screenshot(e,gopath,outpath="./plugins/San-plugin/resources/img/screenshot.png"){

        // 启动浏览器
        const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
        // 新建一个页面
        const page = await browser.newPage();
        // 设置页面大小
        await page.setViewport({ width: 1920, height: 1080 });
        // 打开HTML文件
        await page.goto(`${gopath}`, { waitUntil: 'networkidle0' });
        // 将页面渲染为图片并保存到本地
        await page.screenshot({ path: `${outpath}`, fullPage: true });
        // 关闭浏览器
        await browser.close();
        //发送图片
        await e.reply(segment.image(`${outpath}`))
        // 删除文件
        fs.unlink(outpath, (err) => {
            if (err) {
            logger.error(`——————San-plugin报错————`);
            logger.error(`${err}`);
            return;
            }
        });
}





