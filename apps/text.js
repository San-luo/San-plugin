import * as tool from '../models/tool.js';
import fs from 'fs'
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
          // 执行方法
            },
            { 
          reg: '^#截图.*$',
          fnc: 'screenshot' 
                // 执行方法
            }   
    ]
      })
  
    }
    async text (e) {   
      let obj = await tool.readyaml('./plugins/San-plugin/config/config.yaml')
      logger.warn(obj)
      const weatherPriority = obj.priority.find(item => item.weather !== undefined)?.weather;
      logger.warn(obj.priority[0])
      logger.warn(weatherPriority)




    };

    async screenshot (e){

    }
  }