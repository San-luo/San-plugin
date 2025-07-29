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
        if (!source){
            e.reply("请引用消息来获取e实例")
            return
        }
        
BigIntToString(source)
    
        let messages = source 
            const jsonString = JSON.stringify(messages, null, 2);
            const msgjsonString = JSON.stringify(messages.message, null, 2);
            let makeForwardMsg = await common.makeForwardMsg(e, ["_____message_____",msgjsonString,"_____________","_____e实例_____",jsonString,"_____________"], 'e实例')
            e.reply(makeForwardMsg)
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