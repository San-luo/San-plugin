<<<<<<< HEAD
import * as tool from '../models/tool.js';
import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';
import common from '../../../lib/common/common.js';
let user_tags = {}//用作中转变量

let faceFile = "./plugins/San-plugin/resources/face/userface.json"
export class San_AddFace extends plugin {
    constructor() {
        super({
            name: 'San-plugin表情功能',
            dsc: 'San-plugin表情功能',
            event: 'message', //发出提示信息
            priority: '-100', //优先级
            rule: [
                {
                    reg: '^#(批量|连续|多个|持续)?添加.*$',
                    fnc: 'add'
                    // 执行方法
                },
                {
                    reg: '^#?(散|san|San)设置表情添加(开启|关闭)$',
                    fnc: 'addswitch'
                    // 执行方法
                },
                {
                    reg: '#表情列表$',
                    fnc: 'facelist'
                },
                {
                    reg: '^#?(散|san|San)?表情删除(全部项(.*?))?$',
                    fnc: 'deleteface'
                },
            ]
        })

    }

    async addnext(e) {
        const tag = user_tags[this.e.user_id].tag
        const iscontinous = user_tags[this.e.user_id]["iscontinous"]
        let msg = this.e.msg
        let msgtype = this.e.message[0].type
        const stoplist = ['结束添加', '终止添加', '停止添加', '放弃添加', '终止','停止','放弃','#结束添加', '#终止添加', '#停止添加', '#放弃添加', '#终止','#停止','#放弃'];
        if(iscontinous){
            if (stoplist.includes(msg)) {
                e.reply(`- ${tag} - 连续添加已结束`);
                delete user_tags[e.user_id]; // 清除用户的tag
                this.finish('addnext')
                return;
            }
        }else{
            if (stoplist.includes(msg)) {
            e.reply('已放弃本次添加');
            delete user_tags[e.user_id]; // 清除用户的tag
            this.finish('addnext')
            return;
        }
        }



        //以下为image类型的消息处理
        if (msgtype == "image") {
            const imgNumber = await tool.countFilesInDirectorySync(`./plugins/San-plugin/resources/face/images`)
            //image下载至本地
            let imageFile = `./plugins/San-plugin/resources/face/images/${imgNumber + 1}.gif`
            let url = this.e.message[0].url
            await tool.downloadImage(url, imageFile)

            let date = {}
            if (fs.existsSync(faceFile)) {
                date = await tool.readFromJsonFile(faceFile)
                if (date[tag] == undefined) {
                    date[`${tag}`] = {

                        'list': [{
                            'user_id': e.user_id,
                            'time': tool.convertTime(Date.now(), 0),
                            'type': this.e.message[0].type,
                            'url': this.e.message[0].url,
                            'imageFile': imageFile,

                        },
                        ]
                    }
                    //判断是否存在同名tag,存在则使用初始化方法，不存在则使用push方法
                } else {

                    date[tag].list.push(
                        {
                            'user_id': e.user_id,
                            'time': tool.convertTime(Date.now(), 0),
                            'type': this.e.message[0].type,
                            'url': this.e.message[0].url,
                            'imageFile': imageFile,
                        }
                    )

                }
            } else {
                date[`${tag}`] = {

                    'list': [{
                        'user_id': e.user_id,
                        'time': tool.convertTime(Date.now(), 0),
                        'type': this.e.message[0].type,
                        'url': this.e.message[0].url,
                        'imageFile': imageFile,

                    },
                    ]
                }
            }//判断是否有userface文件,若无则进行初始化

            tool.JsonWrite(date, faceFile)
            e.reply(`${tag} 添加成功`)
            if(!iscontinous){

            this.finish('addnext')
            }
        }else{                  //image类型消息处理完毕
            let date = {}
            if (fs.existsSync(faceFile)) {
                date = await tool.readFromJsonFile(faceFile)
            } else {
                date[`${tag}`] = {

                    'list': [{
                        'user_id': e.user_id,
                        'time': tool.convertTime(Date.now(), 0),
                        'type': "other",
                        'msg': this.e.message
                    },
                    ]
                }
            }//判断是否有userface文件,若无则进行初始化
            if (date[tag] == undefined) {
                date[`${tag}`] = {

                    'list': [{
                        'user_id': e.user_id,
                        'time': tool.convertTime(Date.now(), 0),
                        'type': "other",
                        'msg': this.e.message
                    },
                    ]
                }
                //判断是否存在同名tag,存在则使用初始化方法，不存在则使用push方法
            } else {

                date[tag].list.push(
                    {
                        'user_id': e.user_id,
                        'time': tool.convertTime(Date.now(), 0),
                        'type': "other",
                        'msg': this.e.message
                    }
                )

            }
            tool.JsonWrite(date, faceFile)

            delete user_tags[e.user_id]; // 清除用户的tag
            e.reply(`${tag} 添加成功`)
            if(!iscontinous){

            this.finish('addnext')
            }
        }                           

            
    }

    async add(e) {
        let addcode = await returnaddcode() //0开 1关

        if (addcode == 0) {
            e.reply("表情添加已关闭,请发送#san设置表情添加开启")
            return
        }
        // 检查文件夹是否存在，如果不存在则创建
        if (!fs.existsSync("./plugins/San-plugin/resources/face/images")) {
            fs.mkdir("./plugins/San-plugin/resources/face/images", {
                recursive: true
            }, (err) => {
                if (err) {
                    console.error('创建文件夹失败:', err);
                }
            });
        } else {
            console.log('文件夹已存在');
        }
        
        /** 设置上下文，后续接收到内容会执行hei方法 */
        this.setContext('addnext');
        let msg = e.msg
        let reg = /^#(批量|连续|多个|持续)?添加\s*(.*)$/;// ^#(批量|连续|多个|持续)?添加.*$

        let match = msg.match(reg)
        let iscontinous = match[1] ? true : false
        logger.info(iscontinous)
        //logger.info(match)
        if (match[2] == '') {
            this.finish('addnext')
            e.reply("tag禁止为空!")
            return
        } else {
            // 确保 user_tags 中有该用户的对象
            if (!user_tags[e.user_id]) {
                user_tags[e.user_id] = {};
            }
            user_tags[e.user_id]["tag"] = match[2] //获取到添加tag
            user_tags[e.user_id]["iscontinous"] = iscontinous //获取到添加类型
            e.reply("请发送添加内容")
        }

    }

    async addswitch(e) {
        if (!tool.ismaster(e.user_id)) {
            e.reply('你不是我的主人哦')
            return false
        }

        let reg = /^#?(散|san|San)设置表情添加(开启|关闭)$/
        let str = e.msg
        const match = str.match(reg)
        //logger.info(match)
        const state = match[2]
        if (state == "开启") {
            let url = 'https://sanluo.icu:11111/down/RdDzehzqewKw.js'
            await tool.downloadImage(url, "node_modules/icqq/lib/message/parser.js")
            let Cfg = await tool.readyaml('./plugins/San-plugin/config/config.yaml')
            Cfg["add-face"] = "open"
            const updateCfg = yaml.dump(Cfg);
            fs.writeFile('./plugins/San-plugin/config/config.yaml', updateCfg, 'utf8', (err) => {
                if (err) {
                    logger.err('San-Plugin 错误：', err);
                    return;
                }
            });
            e.reply("已开启,手动重启后生效")
        }

        if (state == "关闭") {
            // let url = 'https://sanluo.top:8888/down/aqcDyo9VfjQX.js'
            // await tool.downloadImage(url, "node_modules/icqq/lib/message/parser.js")
            let Cfg = await tool.readyaml('./plugins/San-plugin/config/config.yaml')
            Cfg["add-face"] = "closed"
            const updateCfg = yaml.dump(Cfg);
            fs.writeFile('./plugins/San-plugin/config/config.yaml', updateCfg, 'utf8', (err) => {
                if (err) {
                    logger.err('San-Plugin 错误：', err);
                    return;
                }
            });
            e.reply("已关闭")
        }

    }


    async facelist(e){
        let facelist = await tool.readFromJsonFile(faceFile)
        let keys = Object.keys(facelist)
        let msg =""
        let t =1
        let addcode = await returnaddcode() //0关 1开
        if (addcode = 0){
            msg = msg +`注意: 表情功能已关闭 开启-> #san设置表情添加开启 `+ "\n"
        }
        for (let i of keys){
            let facetag = facelist[i].list
            let number = facetag.length
            msg = msg +`${t}.  - ${i} - :  ${number}项`+ "\n"
            t++

        }
        let replymsg = await common.makeForwardMsg(e,[`总计${keys.length}个表情`,msg],"-表情列表-")
        e.reply(replymsg)
    }


    async deleteface(e){
        
        let reg = /^#?(散|san|San)?表情删除(全部项(.*?))?$/
        const str = e.msg
        const match = str.match(reg)
        //logger.info(match)
        let isall = match[2] ? true : false
        let facetag = match[3]//tag名  没有时为 ''
        let facelist = await tool.readFromJsonFile(faceFile)
        let keys = Object.keys(facelist)

            if(isall){
                if(!tool.ismaster(e.user_id)){

                    e.reply("非主人无法删除表情包含的全部项")
                    return//非主人尝试删除全部项
                }
                    if (facetag == ''){
                        e.reply("需要删除的表情tag为空!")
                        return//空tag
                    }
                  if (!(keys.includes(facetag))){
                        e.reply(`表情- ${facetag} - 不存在!`)
                        return//不存在此表情tag
                    }
            }
        

        //删除全部项
        if (isall){
            //logger.info(facelist)
            delete facelist[facetag]
            //logger.info(facelist)
            await tool.JsonWrite(facelist,faceFile)

            e.reply(`已删除- ${facetag} -包含的全部项`)
        }
        

        //删除指定项
         if (!isall){
            
            if (!("source" in e)){
                e.reply("请引用消息来删除")
                return
            }
            let targetRand = e.source.rand// 目标rand值
            let obj = await tool.readFromJsonFile(faceFile)
            
            let foundAndDeleted = false;

            // 遍历对象的每个键
            for (let key in obj) {
              if (obj[key].list && Array.isArray(obj[key].list)) {
                // 使用 filter 方法创建一个新的数组，排除掉包含目标 rand 值的对象
                const newList = obj[key].list.filter(item => {
                  if (item.rand && item.rand.includes(targetRand)) {
                    foundAndDeleted = true;
                    return false;
                  }
                  return true;
                });
            
                obj[key].list = newList;
            
                // 如果过滤后的 list 数组为空，删除该键
                if (obj[key].list.length === 0) {
                  delete obj[key];
                }
              }
            }
            
            if (!foundAndDeleted) {
              e.reply("没有找到该表情")
            } else {
                await tool.JsonWrite(obj,faceFile)
                e.reply('已删除该项表情')
            }


         }

    }


}


//监听模式,废弃
// Bot.on?.("message", async(e) => {
//   if (!fs.existsSync(faceFile)) {
//     return
//   }
//   let addcode = await returnaddcode() //0关 1开
//   if (addcode == 0) {
//     return
//   }
//   let msg = e.msg
//   let msgtype = e.message[0].type
//   const obj = await tool.readFromJsonFile(faceFile)
//   let keys = Object.keys(obj)
//   //logger.info(keys)
//   if (keys.includes(msg)) {
//     logger.info(`San-plugin 匹配到 ${msg}`)
//     //logger.info(msgtype)
//   } else {
//     //logger.info(`San-plugin 未匹配到 ${msg}`)
//     //logger.info(e)
//     return
//   }
//   const randomIndex = Math.floor(Math.random() * obj[msg].list.length);
//   const matchType = obj[msg].list[randomIndex].type

//   //以下为iamge消息的处理
//   if (matchType == "image") {
//     e.reply([segment.image(obj[msg].list[randomIndex].imageFile)])
//   }//image消息处理完毕

//   //以下下为text消息的处理
//   if (matchType == "text") {
//     let type; // 声明变量
//     e.reply(obj[msg].list[randomIndex].content)
//   }//text消息处理完毕




// })



//返回表情添加的状态码  0关 1开
async function returnaddcode() {
    let Cfg = await tool.readyaml('./plugins/San-plugin/config/config.yaml')
    const code = Cfg["add-face"]
    //logger.info(code)
    //logger.info(Cfg)
    if (code == "open") {
        return 1
    }
    if (code == "closed") {
        return 0
    }
}





export async function facereply(e){
        if (!fs.existsSync(faceFile)) {
            return
        }
        let addcode = await returnaddcode() //0关 1开
        //logger.info(addcode)
        if (addcode == 0) {
            return
        }
        let msg = e.msg
        const obj = await tool.readFromJsonFile(faceFile)
        let keys = Object.keys(obj)
        //logger.info(keys)
        if (keys.includes(msg)) {
            logger.info(`San-plugin表情回复 匹配到 ${msg}`)
            //logger.info(msgtype)
        } else {
            //logger.info(`San-plugin 未匹配到 ${msg}`)
            //logger.info(e)
            return
        }
        //const randomIndex = Math.floor(Math.random() * obj[msg].list.length);
        // 重复进行两次随机操作，直到两次随机结果相同
    let randomIndex;
    do {
        const firstRandomIndex = Math.floor(Math.random() * obj[msg].list.length);
        const secondRandomIndex = Math.floor(Math.random() * obj[msg].list.length);
        randomIndex = firstRandomIndex === secondRandomIndex ? firstRandomIndex : null;
    } while (randomIndex === null);
        const matchType = obj[msg].list[randomIndex].type
        let face = obj[msg].list[randomIndex]

        let sendmsg 
        //以下为iamge消息的处理
        if (matchType == "image") {
            sendmsg = await e.reply([segment.image(face.imageFile)])
        }//image消息处理完毕

        //以下为other消息的处理
        if (matchType == "other") {
            sendmsg = await e.reply(face.msg)
        }//other消息处理完毕  

        //以下下为text消息的处理
        if (matchType == "text") {
            sendmsg = await e.reply(obj[msg].list[randomIndex].content)
        }//text消息处理完毕

        //以下下为face消息的处理
        if (matchType == "face") {
            sendmsg = await e.reply(segment.face(obj[msg].list[randomIndex].id))
        }//face消息处理完毕

        if ("rand" in face){
            if(face["rand"].length >= 5){
                face["rand"].shift()
                face["rand"].push(sendmsg.rand)
            }else{
                face["rand"].push(sendmsg.rand)
            }   
        }else{

            face["rand"] = [sendmsg.rand]           
        }
        tool.JsonWrite(obj, faceFile)
=======
import * as tool from '../models/tool.js';
import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';
import common from '../../../lib/common/common.js';
let user_tags = {}//用作中转变量


let faceFile = "./plugins/San-plugin/resources/face/userface.json"
export class San_AddFace extends plugin {
    constructor() {
        super({
            name: 'San-plugin表情功能',
            dsc: 'San-plugin表情功能',
            event: 'message', //发出提示信息

            priority: '-100', //优先级

            rule: [
                {
                    reg: '^#(批量|连续|多个|持续)?添加.*$',
                    fnc: 'add'
                    // 执行方法

                },
                {
                    reg: '^#?(散|san|San)设置表情添加(开启|关闭)$',
                    fnc: 'addswitch'
                    // 执行方法

                },
                {
                    reg: '#表情列表$',
                    fnc: 'facelist'
                },
                {
                    reg: '^#?(散|san|San)?表情删除(全部项(.*?))?$',
                    fnc: 'deleteface'
                },
            ]
        })

    }

    async addnext(e) {
        const tag = user_tags[this.e.user_id].tag
        const iscontinous = user_tags[this.e.user_id]["iscontinous"]
        let msg = this.e.msg
        let msgtype = this.e.message[0].type
        const stoplist = ['结束添加', '终止添加', '停止添加', '放弃添加', '终止','停止','放弃','结束','#结束','#结束添加', '#终止添加', '#停止添加', '#放弃添加', '#终止','#停止','#放弃'];
        if(iscontinous){
            if (stoplist.includes(msg)) {
                e.reply(`- ${tag} - 连续添加已结束`);
                delete user_tags[e.user_id]; // 清除用户的tag

                this.finish('addnext')
                return;
            }
        }else{
            if (stoplist.includes(msg)) {
            e.reply('已放弃本次添加');
            delete user_tags[e.user_id]; // 清除用户的tag

            this.finish('addnext')
            return;
        }
        }



        //以下为image类型的消息处理

        if (msgtype == "image") {
            const imgNumber = await tool.countFilesInDirectorySync(`./plugins/San-plugin/resources/face/images`)
            //image下载至本地

            let imageFile = `./plugins/San-plugin/resources/face/images/${imgNumber + 1}.gif`
            let url = this.e.message[0].url
            await tool.downloadImage(url, imageFile)

            let date = {}
            if (fs.existsSync(faceFile)) {
                date = await tool.readFromJsonFile(faceFile)
                if (date[tag] == undefined) {
                    date[`${tag}`] = {

                        'list': [{
                            'user_id': e.user_id,
                            'time': tool.convertTime(Date.now(), 0),
                            'type': this.e.message[0].type,
                            'url': this.e.message[0].url,
                            'imageFile': imageFile,

                        },
                        ]
                    }
                    //判断是否存在同名tag,存在则使用初始化方法，不存在则使用push方法

                } else {

                    date[tag].list.push(
                        {
                            'user_id': e.user_id,
                            'time': tool.convertTime(Date.now(), 0),
                            'type': this.e.message[0].type,
                            'url': this.e.message[0].url,
                            'imageFile': imageFile,
                        }
                    )

                }
            } else {
                date[`${tag}`] = {

                    'list': [{
                        'user_id': e.user_id,
                        'time': tool.convertTime(Date.now(), 0),
                        'type': this.e.message[0].type,
                        'url': this.e.message[0].url,
                        'imageFile': imageFile,

                    },
                    ]
                }
            }//判断是否有userface文件,若无则进行初始化


            tool.JsonWrite(date, faceFile)
            e.reply(`${tag} 添加成功`)
            if(!iscontinous){
            delete user_tags[e.user_id]; // 清除用户的tag
            this.finish('addnext')
            }
        }else{                  //image类型消息处理完毕

            let date = {}
            if (fs.existsSync(faceFile)) {
                date = await tool.readFromJsonFile(faceFile)
            } else {
                date[`${tag}`] = {

                    'list': [{
                        'user_id': e.user_id,
                        'time': tool.convertTime(Date.now(), 0),
                        'type': "other",
                        'msg': this.e.message
                    },
                    ]
                }
            }//判断是否有userface文件,若无则进行初始化

            if (date[tag] == undefined) {
                date[`${tag}`] = {

                    'list': [{
                        'user_id': e.user_id,
                        'time': tool.convertTime(Date.now(), 0),
                        'type': "other",
                        'msg': this.e.message
                    },
                    ]
                }
                //判断是否存在同名tag,存在则使用初始化方法，不存在则使用push方法

            } else {

                date[tag].list.push(
                    {
                        'user_id': e.user_id,
                        'time': tool.convertTime(Date.now(), 0),
                        'type': "other",
                        'msg': this.e.message
                    }
                )

            }
            tool.JsonWrite(date, faceFile)

            

            e.reply(`${tag} 添加成功`)
            if(!iscontinous){
            delete user_tags[e.user_id]; // 清除用户的tag
            this.finish('addnext')
            }
        }                           

            
    }

    async add(e) {
        let addcode = await returnaddcode() //0开 1关


        if (addcode == 0) {
            e.reply("表情添加已关闭,请发送#san设置表情添加开启")
            return
        }
        // 检查文件夹是否存在，如果不存在则创建

        if (!fs.existsSync("./plugins/San-plugin/resources/face/images")) {
            fs.mkdir("./plugins/San-plugin/resources/face/images", {
                recursive: true
            }, (err) => {
                if (err) {
                    console.error('创建文件夹失败:', err);
                }
            });
        } else {
            console.log('文件夹已存在');
        }
        
        /** 设置上下文，后续接收到内容会执行hei方法 */
        this.setContext('addnext');
        let msg = e.msg
        let reg = /^#(批量|连续|多个|持续)?添加\s*(.*)$/;// ^#(批量|连续|多个|持续)?添加.*$


        let match = msg.match(reg)
        let iscontinous = match[1] ? true : false
        logger.info(iscontinous)
        //logger.info(match)

        if (match[2] == '') {
            this.finish('addnext')
            e.reply("tag禁止为空!")
            return
        } else {
            // 确保 user_tags 中有该用户的对象

            if (!user_tags[e.user_id]) {
                user_tags[e.user_id] = {};
            }
            user_tags[e.user_id]["tag"] = match[2] //获取到添加tag

            user_tags[e.user_id]["iscontinous"] = iscontinous //获取到添加类型
            
            if(!iscontinous){
            e.reply("请发送添加内容")
          }else{
          e.reply('请发送添加内容,结束请发#结束添加')
        }
           
        }

    }

    async addswitch(e) {
        if (!tool.ismaster(e.user_id)) {
            e.reply('你不是我的主人哦')
            return false
        }

        let reg = /^#?(散|san|San)设置表情添加(开启|关闭)$/
        let str = e.msg
        const match = str.match(reg)
        //logger.info(match)

        const state = match[2]
        if (state == "开启") {
            let url = 'https://sanluo.icu:11111/down/RdDzehzqewKw.js'
            await tool.downloadImage(url, "node_modules/icqq/lib/message/parser.js")
            let Cfg = await tool.readyaml('./plugins/San-plugin/config/config.yaml')
            Cfg["add-face"] = "open"
            const updateCfg = yaml.dump(Cfg);
            fs.writeFile('./plugins/San-plugin/config/config.yaml', updateCfg, 'utf8', (err) => {
                if (err) {
                    logger.err('San-Plugin 错误：', err);
                    return;
                }
            });
            e.reply("已开启,手动重启后生效")
        }

        if (state == "关闭") {
            // let url = 'https://sanluo.top:8888/down/aqcDyo9VfjQX.js'

            // await tool.downloadImage(url, "node_modules/icqq/lib/message/parser.js")

            let Cfg = await tool.readyaml('./plugins/San-plugin/config/config.yaml')
            Cfg["add-face"] = "closed"
            const updateCfg = yaml.dump(Cfg);
            fs.writeFile('./plugins/San-plugin/config/config.yaml', updateCfg, 'utf8', (err) => {
                if (err) {
                    logger.err('San-Plugin 错误：', err);
                    return;
                }
            });
            e.reply("已关闭")
        }

    }


    async facelist(e){
        let facelist = await tool.readFromJsonFile(faceFile)
        let keys = Object.keys(facelist)
        let msg =""
        let t =1
        for (let i of keys){
            let facetag = facelist[i].list
            let number = facetag.length
            msg = msg +`${t}.  - ${i} - :  ${number}项`+ "\n"
            t++

        }
        let replymsg = await common.makeForwardMsg(e,[`总计${keys.length}个表情`,msg],"-表情列表-")
        e.reply(replymsg)
    }


    async deleteface(e){
        
        let reg = /^#?(散|san|San)?表情删除(全部项(.*?))?$/
        const str = e.msg
        const match = str.match(reg)
        //logger.info(match)

        let isall = match[2] ? true : false
        let facetag = match[3]//tag名  没有时为 ''

        let facelist = await tool.readFromJsonFile(faceFile)
        let keys = Object.keys(facelist)

            if(isall){
                if(!tool.ismaster(e.user_id)){

                    e.reply("非主人无法删除表情包含的全部项")
                    return//非主人尝试删除全部项

                }
                    if (facetag == ''){
                        e.reply("需要删除的表情tag为空!")
                        return//空tag

                    }
                  if (!(keys.includes(facetag))){
                        e.reply(`表情- ${facetag} - 不存在!`)
                        return//不存在此表情tag

                    }
            }
        

        //删除全部项

        if (isall){
            //logger.info(facelist)

            delete facelist[facetag]
            //logger.info(facelist)

            await tool.JsonWrite(facelist,faceFile)

            e.reply(`已删除- ${facetag} -包含的全部项`)
        }
        

        //删除指定项

         if (!isall){
            
            if (!("source" in e)){
                e.reply("请引用消息来删除")
                return
            }
            let targetRand = e.source.rand// 目标rand值

            let obj = await tool.readFromJsonFile(faceFile)
            
            let foundAndDeleted = false;

            // 遍历对象的每个键

            for (let key in obj) {
              if (obj[key].list && Array.isArray(obj[key].list)) {
                // 使用 filter 方法创建一个新的数组，排除掉包含目标 rand 值的对象

                const newList = obj[key].list.filter(item => {
                  if (item.rand && item.rand.includes(targetRand)) {
                    foundAndDeleted = true;
                    return false;
                  }
                  return true;
                });
            
                obj[key].list = newList;
            
                // 如果过滤后的 list 数组为空，删除该键

                if (obj[key].list.length === 0) {
                  delete obj[key];
                }
              }
            }
            
            if (!foundAndDeleted) {
              e.reply("没有找到该表情")
            } else {
                await tool.JsonWrite(obj,faceFile)
                e.reply('已删除该项表情')
            }


         }

    }


}


//监听模式,废弃

// Bot.on?.("message", async(e) => {

//   if (!fs.existsSync(faceFile)) {

//     return

//   }

//   let addcode = await returnaddcode() //0关 1开

//   if (addcode == 0) {

//     return

//   }

//   let msg = e.msg

//   let msgtype = e.message[0].type

//   const obj = await tool.readFromJsonFile(faceFile)

//   let keys = Object.keys(obj)

//   //logger.info(keys)

//   if (keys.includes(msg)) {

//     logger.info(`San-plugin 匹配到 ${msg}`)

//     //logger.info(msgtype)

//   } else {

//     //logger.info(`San-plugin 未匹配到 ${msg}`)

//     //logger.info(e)

//     return

//   }

//   const randomIndex = Math.floor(Math.random() * obj[msg].list.length);

//   const matchType = obj[msg].list[randomIndex].type


//   //以下为iamge消息的处理

//   if (matchType == "image") {

//     e.reply([segment.image(obj[msg].list[randomIndex].imageFile)])

//   }//image消息处理完毕


//   //以下下为text消息的处理

//   if (matchType == "text") {

//     let type; // 声明变量

//     e.reply(obj[msg].list[randomIndex].content)

//   }//text消息处理完毕





// })




//返回表情添加的状态码  0关 1开

async function returnaddcode() {
    let Cfg = await tool.readyaml('./plugins/San-plugin/config/config.yaml')
    const code = Cfg["add-face"]
    //logger.info(code)

    //logger.info(Cfg)

    if (code == "open") {
        return 1
    }
    if (code == "closed") {
        return 0
    }
}





export async function facereply(e){
        if (!fs.existsSync(faceFile)) {
            return
        }
        let addcode = await returnaddcode() //0关 1开

        //logger.info(addcode)

        if (addcode == 0) {
            return
        }
        let msg = e.msg
        const obj = await tool.readFromJsonFile(faceFile)
        let keys = Object.keys(obj)
        //logger.info(keys)

        if (keys.includes(msg)) {
            logger.info(`San-plugin表情回复 匹配到 ${msg}`)
            //logger.info(msgtype)

        } else {
            //logger.info(`San-plugin 未匹配到 ${msg}`)

            //logger.info(e)

            return
        }
        //const randomIndex = Math.floor(Math.random() * obj[msg].list.length);

        // 重复进行两次随机操作，直到两次随机结果相同

    let randomIndex;
    do {
        const firstRandomIndex = Math.floor(Math.random() * obj[msg].list.length);
        const secondRandomIndex = Math.floor(Math.random() * obj[msg].list.length);
        randomIndex = firstRandomIndex === secondRandomIndex ? firstRandomIndex : null;
    } while (randomIndex === null);
        const matchType = obj[msg].list[randomIndex].type
        let face = obj[msg].list[randomIndex]

        let sendmsg 
        //以下为iamge消息的处理

        if (matchType == "image") {
            sendmsg = await e.reply([segment.image(face.imageFile)])
        }//image消息处理完毕


        //以下为other消息的处理

        if (matchType == "other") {
            sendmsg = await e.reply(face.msg)
        }//other消息处理完毕  


        //以下下为text消息的处理

        if (matchType == "text") {
            sendmsg = await e.reply(obj[msg].list[randomIndex].content)
        }//text消息处理完毕


        //以下下为face消息的处理

        if (matchType == "face") {
            sendmsg = await e.reply(segment.face(obj[msg].list[randomIndex].id))
        }//face消息处理完毕


        if ("rand" in face){
            if(face["rand"].length >= 5){
                face["rand"].shift()
                face["rand"].push(sendmsg.rand)
            }else{
                face["rand"].push(sendmsg.rand)
            }   
        }else{

            face["rand"] = [sendmsg.rand]           
        }
        tool.JsonWrite(obj, faceFile)
>>>>>>> dd75ce966eb2273f74ad42b2d6e941a050878f9b
}