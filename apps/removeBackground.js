import { Client } from '@gradio/client'
import * as tool from '../models/tool.js';

const apiUrl = 'http://5.181.225.107:47782/' // Gradio API 地址,致谢@喵~  api的搭建和提供者
const cfg_priority = await tool.set_priority("removeBackground")
export class San_RemoveBackground extends plugin {
    constructor() {
        super({
            name: '去背景',
            dsc: '为图片去除背景',
            event: 'message',
            priority: cfg_priority,
            rule: [
                {
                    reg: '^#?(去背景|抠图|扣图)$',
                    fnc: 'removeBackground'
                }
            ]
        })


    }
    async removeBackground(e) {
        if(await tool.checkApi(apiUrl) == false){
            e.reply("连接api服务器失败", true);
            return;
        }
        let sourceUrl = await tool.getsource(e,true)
        //logger.error(sourceUrl)       
        if (sourceUrl) {
            let img = sourceUrl[0]
            //logger.info(img)
            e.reply("收到图喽....")
            await getImg(e,img,apiUrl)
        }else{
            /** 设置上下文，后续接收到内容会执行hei方法 */
            this.setContext('receive');
            e.reply("请发送图片")

        }

    }

    async receive(e){
        let sourceUrl = await tool.getsource(this.e,true)
        //logger.info(this.e)
        //logger.error(sourceUrl)
        if(sourceUrl === false){
            e.reply("错误,非图片格式",true)
            this.finish('receive')//结束上下文 
            return   
        }
        let img = sourceUrl[0]
        e.reply("收到图喽....")
        await getImg(e,img,apiUrl)
        this.finish('receive')//结束上下文
}



}
async function getImg(e, sourceUrl, apiUrl) {
    try {
        const response_0 = await fetch(sourceUrl);
        const exampleImage = await response_0.blob();
                                
        const client = await Client.connect(apiUrl);
        const result = await client.predict("/rmbg_fn", { 
                        img: exampleImage, 
        });

        //logger.info(result.data);
        e.reply(segment.image(result.data[1].url), true);

    } catch (err) {
        logger.error(err);
        e.reply("出错了，请检查日志", true);
    }
}






