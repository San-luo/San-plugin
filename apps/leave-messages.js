//import plugin from '../../lib/plugins/plugin.js'
//导出  类  类名:要与文件名一致 继承  插件类  
import { segment } from 'oicq';
import * as tool from '../models/tool.js';
const master = tool.masterQQ()//获取主人QQ,可更改为指定qq号
const cfg_priority = await tool.set_priority("LeaveMessages")
 export class San_Leave_Message extends plugin {
    constructor() {
        super({
            //后端信息
            name: '留言',//插件名字，可以随便写
            dsc: '给主人留言',//插件介绍，可以随便写
            event: 'message',//这个直接复制即可，别乱改
            priority: cfg_priority,//执行优先级：数值越低越6
            rule: [
                {
                    //正则表达式
                    reg: '^#?留言$',
                    //函数
                    fnc: 'liuyan'
                }
            ]
        });
    };

   
    //函数
    async liuyan(e) {
 
        /** 设置上下文，后续接收到内容会执行hei方法 */
        this.setContext('hei');
        let xinxi = [
            "发送对象："+Bot.fl.get(master).nickname+master,
            segment.image(Bot.pickUser(master).getAvatarUrl()),
            "请输入留言内容"

        ]
        //发送消息
         e.reply(xinxi);
        
    }

    //回复函数
    async hei(e) {
        //获取消息
        let xiaoxi = this.e;//消息内容
        await Bot.pickUser(master).sendMsg([
            "主人有人给你留言啦",
            
            "\n"+Bot.pickFriend(e.user_id).nickname+e.user_id,
            segment.image(Bot.pickUser(e.user_id).getAvatarUrl()),
            "留言内容："
        ])

        async function replyxiaoxi(){
        if (xiaoxi.message[0].type == "image"){
             let neirong = segment.image(xiaoxi.message[0].url)
             Bot.pickUser(master).sendMsg(neirong)
        }
        if (xiaoxi.message[0].type == "text"){
            Bot.pickUser(master).sendMsg(["",""+xiaoxi])
        }
        if (xiaoxi.message[0].type == "face"){
            let neirong = segment.face(xiaoxi.message[0].id)
            Bot.pickUser(master).sendMsg(neirong)
        }
        e.reply("主人已经收到你的消息啦")
        }
            setTimeout(() => {
            replyxiaoxi()
        }, 1000);
        this.finish('hei')
    }   
}
