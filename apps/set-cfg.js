import common from '../../../lib/common/common.js';
import config from '../../../lib/config/config.js'
import * as tool from '../models/tool.js';
import yaml from 'js-yaml';
import fs from 'fs'
export class San_SetCfg extends plugin {
    constructor () {
      super({
        name: 'San_SetCfg',
        dsc: '修改San-plugin配置信息',
        event: 'message',//发出提示信息
        priority: '200',//优先级
        rule: [
            { 
            reg: '^#?(散|san|San)设置.*$',
            fnc: 'SetCfg'
                // 执行方法
            }   
    ]
      })
  
    }
    async SetCfg (e) {
        if (e.user_id != config.masterQQ[0]){
            e.reply("你不是我的主人哦")
            return false
        } 
        let reg = /^#?(散|san|San)设置([\u4e00-\u9fa5]*)?(\d*)?$/
        let str = e.msg
        const match = str.match(reg)


            let Cfg_config = await tool.readyaml('./plugins/San-plugin/config/config.yaml')  
            let Cfg_priority = await tool.readyaml('./plugins/San-plugin/config/priority.yaml') 
            let ChangeInfo = parseInt(match[3],10)
            switch (match[2]) {
                case `图像质量`:
                    Cfg_config.imgQuality = ChangeInfo ;
                    break;
                case `优先级天气`:
                    Cfg_priority.weather = ChangeInfo ;
                    break;
                case `优先级留言`:
                    Cfg_priority.LeaveMessages = ChangeInfo ;
                    break;
                default:
                    //e.reply("指令未匹配") ;
                    break;
            }
            const update_config = yaml.dump(Cfg_config);
            const update_priority = yaml.dump(Cfg_priority);
            fs.writeFile('./plugins/San-plugin/config/config.yaml', update_config, 'utf8', (err) => {
                if (err) {
                logger.err('San-Plugin 错误：', err);
                return;
                }
            });
            fs.writeFile('./plugins/San-plugin/config/config.yaml', update_priority, 'utf8', (err) => {
                if (err) {
                logger.err('San-Plugin 错误：', err);
                return;
                }
            });

            let CgfInfo =[
                `图像质量：${Cfg_config.imgQuality}`,
            ]
            let PriorityInfo = [
                `天气：${Cfg_priority.weather}`,
                `留言：${Cfg_priority.LeaveMessages}`
            ]
            const PriorityMsg = await common.makeForwardMsg(e, PriorityInfo, '优先级信息')
            const makeForwardMsg = await common.makeForwardMsg(e, [CgfInfo, PriorityMsg], 'San设置信息')
            this.e.reply(makeForwardMsg)
        }








  }