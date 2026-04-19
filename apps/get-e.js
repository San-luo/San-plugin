/*
 * @Author: random
 * @Date: 2025-11-11 23:05:58
 * @Last Modified by: random
 * @Last Modified time: Do not Edit
 */
import common from '../../../lib/common/common.js';
import * as tool from '../models/tool.js';
const cfg_priority = await tool.set_priority("get_e")
export class gete extends plugin {
    constructor() {
        super({
            name: 'get-e',
            dsc: '获取e实例',
            event: 'message',
            priority: cfg_priority,
            rule: [
                {
                    reg: '^#?取$', 
                    fnc: 'get'
                }
            ]
        }); 

    }
    async get(e){
        let source = ""
        if (e.getReply) {
            source = await e.getReply()
          } else if (e.source) {
            if (e.group?.getChatHistory) {
              source = (await e.group.getChatHistory(e.source.seq, 1)).pop()
            } else if (e.friend?.getChatHistory) {
              source = (await e.friend.getChatHistory(e.source.time, 1)).pop()
            }
          }       
          let rawSource = source  
        if (!source){
            e.reply("请引用消息来获取e实例")
            return
        }
        if(source.message[0].type == "json"){
            //e.reply("暂时不支持NC崽对Bot所发聊天记录消息的引用,请非引用添加,手动转发")
          const innerData = JSON.parse(source.message[0].data);
          const resid = innerData.meta.detail?.resid;
          if(resid){
          let msg = e.isGroup ? await e.group.getForwardMsg(resid) : await e.friend.getForwardMsg(resid)
          source = msg
          }

        }
        BigIntToString(source)
    
        let messages = source 
        if(messages?.client){
          delete messages.client
        }
        const jsonString = JSON.stringify(messages, null, 2);
        let msgjsonString = JSON.stringify(messages.message, null, 2);
        if(msgjsonString == undefined){msgjsonString = `===raw_e===:\n${JSON.stringify(rawSource, null, 2)}`}
        let makeForwardMsg = await common.makeForwardMsg(e, ["_____message_____",msgjsonString,"_____________","_____e实例_____",jsonString,"_____________"], 'e实例')
        let res = await e.reply(makeForwardMsg)
        if(Object.keys(res) == "error"){
          e.reply("可能结果过长,发送e实例失败")
        }
    }
    
}


// 在序列化前遍历对象，将BigInt转为字符串
function BigIntToString(obj) {
  for (let key in obj) {
    if (typeof obj[key] === 'bigint') {
      obj[key] = obj[key].toString();
    } else if (typeof obj[key] === 'object') {
      BigIntToString(obj[key]);
    }
  }
}