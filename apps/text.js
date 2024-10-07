import * as tool from '../models/tool.js';
import fs from 'fs'
import common from '../../../lib/common/common.js';
import { segment } from 'icqq';
export class San_Text extends plugin {
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
            } 
        ]
      })
    }
    
    async text (e) {   
      let msg = []
      for(let a=0 ; a<10; a++){
        msg.push([`你好${a}`,segment.image(`https://ts1.cn.mm.bing.net/th?id=ORMS.e61ef67db5876fb75119b7d6e2bb01e4&pid=Wdp&w=612&h=328&qlt=90&c=1&rs=1&dpr=1&p=0`)])
      }
      let msgfod=await common.makeForwardMsg(e,msg,"111")
      e.reply(msgfod)



    };

  }