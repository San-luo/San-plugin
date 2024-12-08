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
        if (!tool.ismaster(e.user_id)) {
            e.reply('你不是我的主人哦')
            return false
        }
        let NumberReg = /^#?(散|san|San)设置([\u4e00-\u9fa5]*)?(-?\d*)?$/
        let str = e.msg
        const NumberMatch = str.match(NumberReg)
            let Cfg_config = await tool.readyaml('./plugins/San-plugin/config/config.yaml')  
            let Cfg_priority = await tool.readyaml('./plugins/San-plugin/config/priority.yaml') 
            let ChangeNumber = parseInt(NumberMatch[3],10)
            switch (NumberMatch[2]) {
                case `图像质量`:
                    Cfg_config.imgQuality = ChangeNumber ;
                    break;
                case `优先级天气`:
                    Cfg_priority.weather = ChangeNumber ;
                    break;
                case `优先级留言`:
                    Cfg_priority.LeaveMessages = ChangeNumber ;
                    break;
                case `优先级戳一戳`:
                    Cfg_priority.GroupPoke = ChangeNumber ;
                    break;                    
                default:
                    //e.reply("指令未匹配") ;
                    break;
            }


            let ButtonReg = /^#?(散|san|San)设置([\u4e00-\u9fa5]*)?(开启|关闭)$/
            const ButtonMatch = str.match(ButtonReg)
            let ChangeButton
            let ButtonTag
            if(ButtonMatch === null){
                ChangeButton = "0"
                ButtonTag = "0"
            }else{
                if(ButtonMatch[3] === undefined){
                    ChangeButton = "0"
                    ButtonTag = "0"
                }else{
                    ChangeButton = ButtonMatch[3]
                    ButtonTag = ButtonMatch[2]
                }
            }

            switch (ChangeButton){
                case `开启`:
                    ChangeButton = true;
                    break;
                case `关闭`:
                    ChangeButton = false
                    break;
                default:
                    break;
            }

            switch (ButtonTag) {
                case `表情添加仅主人`:
                    Cfg_config.add_onlyMaster = ChangeButton ;
                    break;  
                case `表情添加`:
                    Cfg_config.add_face = ChangeButton ;
                    break;                  
                default:
                    break;
            }

            switch (NumberMatch[2]) {
                case `图像质量`:
                    Cfg_config.imgQuality = ChangeNumber ;
                    break;
                case `优先级天气`:
                    Cfg_priority.weather = ChangeNumber ;
                    break;
                case `优先级留言`:
                    Cfg_priority.LeaveMessages = ChangeNumber ;
                    break;   
                case `优先级戳一戳`:
                    Cfg_priority.GroupPoke = ChangeNumber ;
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
            fs.writeFile('./plugins/San-plugin/config/priority.yaml', update_priority, 'utf8', (err) => {
                if (err) {
                logger.err('San-Plugin 错误：', err);
                return;
                }
            });
            let sendMsg = []
            let CfgInfo =[
                `图像质量：${Cfg_config.imgQuality}`,
                `表情添加：${button(Cfg_config.add_face)}`,
                `表情添加仅主人：${button(Cfg_config.add_onlyMaster)}`,
            ]
            for (let i of CfgInfo){
                sendMsg.push(i)
            }
            let PriorityInfo = [
                `天气：${Cfg_priority.weather}`,
                `留言：${Cfg_priority.LeaveMessages}`,
                `戳一戳：${Cfg_priority.GroupPoke}`
            ]
            const PriorityMsg = await common.makeForwardMsg(e, PriorityInfo, '优先级信息')
            sendMsg.push(PriorityMsg)
            const makeForwardMsg = await common.makeForwardMsg(e, sendMsg, 'San设置信息')
            this.e.reply(makeForwardMsg)
        




}




  }

          function button(TorF) {
            if(TorF){
                return "开启"
            }else{
                return "关闭"
            }
        }
        