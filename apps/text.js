import * as tool from '../models/tool.js';
import fs from 'fs'
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
            }   
    ]
      })
  
    }
    async text (e) {
      e.reply(Bot.fl.get(tool.masterQQ()).nickname)          
    };

    async screenshot (e){
      tool.screenshot(e,'https://gitee.com/San-luo/San-tool')
    }
  }