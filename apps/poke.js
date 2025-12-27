process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";//忽略ssl
import * as tool from '../models/tool.js';
import fs from 'fs';
import axios from 'axios'; 
import https from 'https';
const cfg_priority = await tool.set_priority("GroupPoke")
//如果用户没有自定义api则使用默认api
const DefaultApi =[
    "https://api.ovoo.cc/api/cjm.php?",//柴郡猫
]
export class San_Poke extends plugin {
    constructor() {
        super({
            //后端信息
            name: 'San-Plugin戳一戳',//插件名字，可以随便写
            dsc: '戳一戳随机表情包',//插件介绍，可以随便写
            event: 'notice.*.poke',//这个直接复制即可，别乱改
            priority: cfg_priority,//执行优先级：数值越低越6
            rule: [
                {
                    fnc: 'poke'
                }
            ]
        });
    };

   async poke(e) {
        //logger.info(await isPokeOnlyOpen())

        //判断 戳一戳功能 有无开启
        if (!(await isPokeOpen())){
            return
          } 
        //判断 戳一戳仅bot 是否开启
        if (await isPokeOnlyOpen()) {
            // 检查 Bot.uin 是否为数组
            if (Array.isArray(Bot.uin)) {
                // 如果是数组，则检查 e.target_id 是否在 Bot.uin 数组中
                if (!Bot.uin.includes(e.target_id)) {
                    return;
                }
            } else {
                // 如果不是数组，则直接比较 e.target_id 和 Bot.uin
                if (e.target_id !== Bot.uin) {
                    return;
                }
            }
        }
         
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
        if(!(await tool.checkApi(url,3000))){
            let msg = await e.reply("连接api服务器失败");
            setTimeout(() => {
                e.group.recallMsg(msg.seq,msg.rand)
            }, 4000);
            return false
        }
        let base64
        try {
            
            const agent = new https.Agent({ rejectUnauthorized: false })
            // 获取图片数据（responseType 设为 'arraybuffer'）
            const response = await axios.get(url, {
              responseType: 'arraybuffer',
              httpsAgent: agent,
            });
        
            // 将二进制数据转为 Base64
            base64 = Buffer.from(response.data, 'binary').toString('base64');
          } catch (error) {
            console.error('Error converting image to Base64:', error);
            throw error;
          }
        e.reply(segment.image(`base64://${base64}`));
        
    }
   
}
//返回戳一戳功能的状态
async function isPokeOpen() {
    let Cfg = await tool.readyaml('./plugins/San-plugin/config/config.yaml')
    const TorF = Cfg.poke
    if (TorF) {
        return true
    }else{
        return false
    }
}

//返回戳一戳仅bot的状态
async function isPokeOnlyOpen() {

    let Cfg = await tool.readyaml('./plugins/San-plugin/config/config.yaml')
    const TorF = Cfg.poke_onlyBot
    if (TorF) {
        return true
    }else{
        return false
    }
}