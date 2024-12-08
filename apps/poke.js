import * as tool from '../models/tool.js';
import fs from 'fs';
//如果用户没有自定义api则使用默认api
const DefaultApi =[
    "https://www.dmoe.cc/random.php",//樱花二次元图
]
export class San_Poke extends plugin {
    constructor() {
        super({
            //后端信息
            name: 'San-Plugin戳一戳',//插件名字，可以随便写
            dsc: '戳一戳随机表情包',//插件介绍，可以随便写
            event: 'notice.group.poke',//这个直接复制即可，别乱改
            priority: -111,//执行优先级：数值越低越6
            rule: [
                {
                    fnc: 'poke'
                }
            ]
        });
    };

   async poke(e) {
        //logger.info(e)
            if(!fs.existsSync(`./plugins/San-plugin/resources/poke/api.yaml`)){
            let random = Math.floor(Math.random() * DefaultApi.length)
            let url = DefaultApi[random]
            e.reply(segment.image(url));
            return
        }
        let randomlist = []
        const urllist = await tool.readyaml(`./plugins/San-plugin/resources/poke/api.yaml`)
        for (let i in urllist) {
            //logger.info(i)
            if(urllist[i].isopen){
                randomlist.push(urllist[i].api)
            }            
        }
        if(randomlist[0] === undefined){
            let random = Math.floor(Math.random() * DefaultApi.length)
            let url = DefaultApi[random]
            e.reply(segment.image(url));
            return
        }
        let random = Math.floor(Math.random() * randomlist.length)
        let url = randomlist[random]

        e.reply(segment.image(url));
        
    }
   
}