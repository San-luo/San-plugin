import * as tool from '../models/tool.js';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import common from '../../../lib/common/common.js';
import puppeteer from '../../../lib/puppeteer/puppeteer.js';

let user_tags = {}//用作中转变量
let laidianNub = 50 //来点表情 的发送表情数量(聊天记录形式)

let faceFile = "./data/San/face/userface.json"

// 初始化目录和文件
function initFaceData() {
    const faceDir = "./data/San/face"
    const imageDir = "./data/San/face/images"

    // 创建目录
    if (!fs.existsSync(faceDir)) {
        fs.mkdirSync(faceDir, { recursive: true })
        logger.info('[San-plugin] 创建表情目录: ' + faceDir)
    }
    if (!fs.existsSync(imageDir)) {
        fs.mkdirSync(imageDir, { recursive: true })
        logger.info('[San-plugin] 创建图片目录: ' + imageDir)
    }

    // 创建JSON文件
    if (!fs.existsSync(faceFile)) {
        fs.writeFileSync(faceFile, '{}', 'utf8')
        logger.info('[San-plugin] 创建表情数据文件: ' + faceFile)
    }
}

// 在模块加载时初始化
initFaceData()

export class San_AddFace extends plugin {
    constructor() {
        super({
            name: 'San-plugin表情功能',
            dsc: 'San-plugin表情功能',
            event: 'message', //发出提示信息
            priority: '-100', //优先级
            rule: [
                {
                    reg: '^#(全局)?(批量|连续|多个|持续)?添加.*$',
                    fnc: 'add'
                    // 执行方法
                },
                {
                    reg: '^#?(散|san|San)?表情列表$',
                    fnc: 'facelist'
                },
                {
                    reg: '^#?(散|san|San)设置表情添加(开启|关闭)$',
                    fnc: 'addswitch'
                },
                {
                    reg: '.*#(散|san|San)?表情(删除|删去|去除)(全部项(.*?))?$',
                    fnc: 'deleteface'
                },
                {
                    reg: '^#?(散|san|San)?来点(.*)$',
                    fnc: 'laidian'
                },
                {
                    reg: '^(.*)$',
                    fnc: 'recordBotMessage',
                    log: false,
                },
                {
                    reg: '^(.*)$',
                    fnc: 'facereply',
                    log: false,
                },
                {
                    reg: '^#?(散|san|San)?合并(表情|数据)?$',
                    fnc: 'mergeFace'
                },
            ]
        })

    }

    // 记录机器人自己发送的消息ID
    async recordBotMessage(e) {
        // 只处理视频消息
        if (!e.message || e.message.length === 0 || e.message[0].type !== 'video') {
            return false
        }

        // 只处理机器人自己发送的消息
        // 检查多种可能的机器人ID
        const botIds = [e.self_id, Bot.uin, e.bot?.uin, 263735076, 3889045534]
        const isBotMessage = botIds.some(id => id && (e.user_id == id || String(e.user_id) == String(id)))

        logger.info(`[表情记录] 检测到视频消息，user_id=${e.user_id}, self_id=${e.self_id}, Bot.uin=${Bot.uin}, isBotMessage=${isBotMessage}`)

        if (!isBotMessage) {
            return false
        }

        logger.info(`[表情记录] 确认是机器人发送的视频消息`)

        try {
            const obj = await tool.readFromJsonFile(faceFile)
            let updated = false

            // 遍历所有表情，找到最近发送的视频表情
            for (let tag in obj) {
                if (obj[tag].list && Array.isArray(obj[tag].list)) {
                    for (let face of obj[tag].list) {
                        // 只处理视频类型的表情
                        if (face.type === 'video' && face.videoFile) {
                            // 检查是否是最近5秒内的表情（避免误匹配）
                            const faceTime = new Date(face.time).getTime()
                            const now = Date.now()
                            if (now - faceTime < 10000) { // 10秒内
                                // 提取机器人消息的所有ID
                                let botIds = []
                                if(e.message_id !== undefined && e.message_id !== null){
                                    botIds.push(String(e.message_id))
                                }
                                if(e.rand !== undefined && e.rand !== null){
                                    botIds.push(String(e.rand))
                                }
                                if(e.real_id !== undefined && e.real_id !== null){
                                    botIds.push(String(e.real_id))
                                }
                                if(e.seq !== undefined && e.seq !== null){
                                    botIds.push(String(e.seq))
                                }
                                if(e.time !== undefined && e.time !== null){
                                    botIds.push(String(e.time))
                                }
                                botIds = [...new Set(botIds)]

                                logger.info(`[表情记录] 机器人发送视频消息，ID: ${JSON.stringify(botIds)}`)

                                // 将机器人消息ID添加到表情的rand数组中
                                if (!face.rand) {
                                    face.rand = []
                                }
                                for (let id of botIds) {
                                    if (id && !face.rand.includes(id)) {
                                        face.rand.push(id)
                                        updated = true
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if (updated) {
                await tool.JsonWrite(obj, faceFile)
                logger.info('[表情记录] 已更新机器人消息ID到表情数据')
            }
        } catch (error) {
            logger.error('[表情记录] 记录机器人消息ID失败:', error)
        }

        return false
    }

    async addnext(e) {
        try {
            const tag = user_tags[this.e.user_id].tag
            const iscontinous = user_tags[this.e.user_id]["iscontinous"]
            let msg = await tool.getText(this.e)
            const stoplist = ['结束添加', '终止添加', '停止添加', '放弃添加', '终止','停止',
            '放弃','#结束添加', '#终止添加', '#停止添加', '#放弃添加', '#终止','#停止','#放弃'];

            //判断是否结束
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

            //添加表情
            await HandelFace(this.e,tag,user_tags[this.e.user_id]["isglobal"])
            
            //判断是否结束
            if(!iscontinous){
                this.finish('addnext')                                 
        }   
        } catch (error) {
            e.reply("出错辣")
            logger.error(error)
            this.finish('addnext')
            return;
        }

}

    async add(e) {
        if (!(await isAddOpen())) {
            e.reply("表情添加已关闭,请发送#san设置表情添加开启")
            return
        }
        if ((await isAddOnlyOpen())){
            if (!(await tool.ismaster(e.user_id))) {
                e.reply('你不是我的主人哦')
                return false
            }
        }
        
        let msg = await tool.getText(e)
        let reg = /^#(全局)?(批量|连续|多个|持续)?添加\s*(.*)$/;// ^#(批量|连续|多个|持续)?添加.*$

        let match = msg.match(reg)
        let iscontinous = match[2] ? true : false
        let isglobal = match[1] ? true : false
        //logger.info(match)
        if (match[3] == '') {
            e.reply("tag禁止为空!")
            return
        }

        // 确保 user_tags 中有该用户的对象
        if (!user_tags[e.user_id]) {
            user_tags[e.user_id] = {};
        }
        user_tags[e.user_id]["tag"] = match[3] //获取到添加tag
        user_tags[e.user_id]["iscontinous"] = iscontinous //获取到添加类型
        user_tags[e.user_id]["isglobal"] = isglobal //获取到是否全局
        
        if(await tool.getsource(e)){//如果存在引用消息
            //logger.info(await tool.getsource(e))
            let source = await tool.getsource(e)
            // if(source.message[0].type == "json" && e?.getReply){
            //     e.reply([segment.reply(source.message_id), "暂时不支持NC崽对Bot所发聊天记录消息的引用添加,请使用非引用添加,并手动转发此消息"])
            //     return false
            // }
            source.reply = e.reply
            source.isGroup = e.isGroup
            source.group = e?.group
            source.friend = e?.friend
            await HandelFace(source,match[3])
        }else{
        /** 设置上下文，后续接收到内容会执行hei方法 */
        this.setContext('addnext');   
        e.reply("请发送添加内容")
        }
    }

    async addswitch(e) {
        if (!(await tool.ismaster(e.user_id))) {
            e.reply('你不是我的主人哦')
            return false
        }

        let reg = /^#?(散|san|San)设置表情添加(开启|关闭)$/
        let str = await tool.getText(e)
        const match = str.match(reg)
        //logger.info(match)
        const state = match[2]
        if (state == "开启") {
            // let url = 'https://sanluo.icu:11111/down/RdDzehzqewKw.js'
            // await tool.downloadImage(url, "node_modules/icqq/lib/message/parser.js")
            let Cfg = await tool.readyaml('./plugins/San-plugin/config/config.yaml')
            Cfg.add_face = true
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
            Cfg.add_face = false
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
        let facelist = await getFaceData()
        let keys = Object.keys(facelist)
        let msg =""
        let t =1
        //logger.error(`isAddOpen ${isAddOnlyOpen()}`)
        
        if (!(await isAddOpen())){
            msg = msg +`注意: 表情添加已关闭 开启-> `+ "\n"+`#san设置表情添加开启 `+ "\n"
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

        let reg = /.*#(散|san|San)?表情(删除|删去|去除)(全部项(.*?))?$/
        const str = await tool.getText(e)
        const match = str.match(reg)
        //logger.info(match)
        let isall = match[3] ? true : false
        let facetag = match[4]//tag名  没有时为 ''
        let facelist = await getFaceData()
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
            for (let i of facelist[facetag].list ){
                logger.info(i)
                if(i?.imageFile){
                    logger.info(i.imageFile)
                    try {
                        fs.unlinkSync(i.imageFile)
                    } catch (error) {
                        logger.error(error)
                    }

                }
                if(i?.videoFile){
                    logger.info(i.videoFile)
                    try {
                        fs.unlinkSync(i.videoFile)
                    } catch (error) {
                        logger.error(error)
                    }
                }
            }
            delete facelist[facetag]
            //logger.info(facelist)
            await tool.JsonWrite(facelist,faceFile)

            e.reply(`已删除- ${facetag} -包含的全部项`)
        }
        

        //删除指定项
         if (!isall){
            try {
                let source = ""
                if (e.getReply) {
                    source = await e.getReply()
                } else if (e.source) {
                    if (e.group?.getChatHistory && e.source.seq !== undefined) {
                      source = (await e.group.getChatHistory(e.source.seq, 1)).pop()
                    } else if (e.friend?.getChatHistory && e.source.time !== undefined) {
                      source = (await e.friend.getChatHistory(e.source.time, 1)).pop()
                    }
                }
                if (!source){
                    e.reply("请引用消息来删除")
                    return
                }
                let targetIds = []
                if (source.message_id !== undefined && source.message_id !== null) {
                    targetIds.push(String(source.message_id))
                }
                if (source.rand !== undefined && source.rand !== null) {
                    targetIds.push(String(source.rand))
                }
                if (source.real_id !== undefined && source.real_id !== null) {
                    targetIds.push(String(source.real_id))
                }
                if (source.seq !== undefined && source.seq !== null) {
                    targetIds.push(String(source.seq))
                }
                if (source.time !== undefined && source.time !== null) {
                    targetIds.push(String(source.time))
                }
                targetIds = [...new Set(targetIds)]
                logger.info(`[表情删除] 引用消息的ID: ${JSON.stringify(targetIds)}`)
                if (targetIds.length === 0) {
                    e.reply("没有找到可删除的消息标识")
                    return
                }
                let obj = await tool.readFromJsonFile(faceFile)

                let foundAndDeleted = false;

                // 遍历对象的每个键
                for (let key in obj) {
                  if (obj[key].list && Array.isArray(obj[key].list)) {
                    // 使用 filter 方法创建一个新的数组，排除掉包含目标消息标识的对象
                    const newList = obj[key].list.filter(item => {
                      const itemIds = Array.isArray(item.rand)
                        ? item.rand.map(id => String(id))
                        : item.rand !== undefined && item.rand !== null
                          ? [String(item.rand)]
                          : []
                      logger.info(`[表情删除] 检查表情 ${key}, itemIds: ${JSON.stringify(itemIds)}`)
                      if (targetIds.some(id => itemIds.includes(id))) {
                        foundAndDeleted = true;
                        if(item?.imageFile){
                            //logger.info(item.imageFile)
                            try {
                                fs.unlinkSync(item.imageFile)
                            } catch (error) {
                                logger.error(error)
                            }
                        }
                        if(item?.videoFile){
                            //logger.info(item.videoFile)
                            try {
                                fs.unlinkSync(item.videoFile)
                            } catch (error) {
                                logger.error(error)
                            }
                        }
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
            } catch (error) {
                logger.error(error)
                e.reply('删除表情失败，请稍后再试')
            }

         }

    }

    async laidian(e){
        // laidianNub默认值定义在代码顶部 默认为10
        let sendNub = laidianNub
        let res = 'failed'
        let faceArr = []
        let tag = ``
            const msg = await tool.getText(e)
            const reg = /^#?(散|san|San)?来点(.*)$/
            let match = msg.match(reg)
            if(match[2] == ""){
                e.reply("表情名称为空!")
                return
            }
            tag = match[2]
            let obj = await tool.readFromJsonFile(faceFile)
            //logger.info(obj)
            if (!obj[match[2]]) {
                e.reply(`没有找到表情 - ${match[2]} -`)
                return
            }
            let facelist = obj[match[2]].list
            // 根据表情数量决定发送数量
            if(facelist.length < 10){
                sendNub = facelist.length
            }
            let replymsg = []
            for(let i = 0; i < sendNub; i++){
                const randomIndex = Math.floor(Math.random() * facelist.length);
                let face = facelist.splice(randomIndex, 1)[0]; // 移除并返回该元素
                const matchType = face.type
                faceArr.push(face)
                //以下为iamge消息的处理
                if (matchType == "image") {
                    replymsg.push(segment.image(face.imageFile))
                }//image消息处理完毕

                //以下为other消息的处理
                if (matchType == "other") {
                    replymsg.push(face.msg)
                }//other消息处理完毕  

                //以下下为text消息的处理
                if (matchType == "text") {
                    replymsg.push(obj[msg].list[randomIndex].content)
                }//text消息处理完毕

                //以下下为face消息的处理
                if (matchType == "face") {
                    replymsg.push(segment.face(obj[msg].list[randomIndex].id))
                }//face消息处理完毕

                if (matchType == "forward") {
                    for(let i of face.msg){
                        replymsg.push(i.message)
                    }
                }

                //以下为video消息的处理
                if (matchType == "video") {
                    replymsg.push(segment.video(face.videoFile))
                }//video消息处理完毕
            }

            let sendmsg = await common.makeForwardMsg(e,replymsg,`-${match[2]}-`)
            let code
            try {
                code = await e.reply(sendmsg) //如果发送失败 IC:undefined , NC:{error: xxxx }
            } catch (err) {
                logger.error(err)
                code = { error: err }
                res = 'failed'
                logger.warn(code)
            }
            logger.warn(code)
            if(typeof code == 'object' && code?.error){
                 logger.warn('检测到错误，设置res=failed并break')
                 res = 'failed'
            }else{
                // code 是 undefined 或者是没有 error 属性的对象，都视为成功
                res = 'success'
            }

        if (res == 'failed') {
            // 检查是否包含视频，如果有视频则不转图片
            const hasVideo = faceArr.some(face => face.type === 'video')
            if (hasVideo) {
                e.reply(`视频发送失败`)
                return
            }

            e.reply(`报错! 转图片发送...`)
            // 转图片发送
            const html = msgToImg(faceArr,tag)
            const tpPath = `./plugins/San-plugin/resources/html/temp_render_${tool.getId()}.html`
            fs.writeFileSync(tpPath, html, 'utf8');
            let img;
            try {
                img = await puppeteer.screenshot('SanFace', { tplFile: tpPath });
                await e.reply(img)
            } finally {
                if (fs.existsSync(tpPath)) {
                    try { fs.unlinkSync(tpPath); } catch (err) {}
                }
            }

        }
    }
    //表情触发并回复
    async facereply(e){
        //判断目录 功能是否开启
        if (!fs.existsSync(faceFile) || !isAddOpen()) {
            return false
        }

        let msg = await tool.getText(e)
        const obj = await tool.readFromJsonFile(faceFile)
        let keys = Object.keys(obj)

        if (keys.includes(msg)) {
            logger.info(`San-plugin表情回复 匹配到 ${msg}`)
            //logger.info(msgtype)
        } else {
            //兼容#开头字段 补充判断
            let reg = /^#(.*)$/;
            //logger.info(msg)
            if (!msg) { return false } //排除非字符串消息
            let match = msg.match(reg)
            if (!match) { return false }
            if (keys.includes(match[1])) {
                msg = match[1]
                logger.info(`San-plugin表情回复 匹配到 ${msg}`)
            }else{
                return false
            }
        }

        let indexArr = []
        //判断是否为群组消息
        if(await isFaceGroupApart()){
            if(e.isGroup){
                //判断是否为群组分离状态
                    //返回符合条件的表情
                    let i = -1
                    for(let item of obj[msg][`list`]){
                        i++
                        if(item?.belong?.includes(e.group_id) || item?.belong?.length == 0 || !(item?.belong)){
                            indexArr.push(i)
                        }
                    }
            }else{
                //私聊情况下

                //权限判断
                if (!(await tool.ismaster(e.user_id))) {
                    logger.info(`已开启表情群组分离,非主人禁止私聊发送`)
                    return false
                }

                let i = -1
                for(let item of obj[msg][`list`]){
                    i++
                    indexArr.push(i)
                }
            }
        }else{
            let i = -1
            for(let item of obj[msg][`list`]){
                i++
                indexArr.push(i)
            }
        }


        if(indexArr.length < 1){ 
            logger.info(`触发词-${msg}- 没有符合条件的表情`)
            return false 
        
        } //没有符合条件的表情

        //随机获取一个表情
        let randomIndex = Math.floor(Math.random() * indexArr.length)
        let face = obj[msg].list[indexArr[randomIndex]]
        const matchType = face.type

        let sendmsg 
        //以下为iamge消息的处理
        if (matchType == "image") {
            sendmsg = await e.reply([segment.image(face.imageFile)])
        }//image消息处理完毕

        //以下为other消息的处理
        if (matchType == "other") {
            sendmsg = await e.reply(face.msg)
        }//other消息处理完毕  

        //以下为forward消息的处理
        if (matchType == "forward") {
            let Msg = e.isGroup ? await e.group.makeForwardMsg(face.msg) : await e.friend.makeForwardMsg(face.msg)
            sendmsg = await e.reply(Msg)
        }//forward消息处理完毕  

        //以下下为text消息的处理
        if (matchType == "text") {
            sendmsg = await e.reply(obj[msg].list[randomIndex].content)
        }//text消息处理完毕

        //以下下为face消息的处理
        if (matchType == "face") {
            sendmsg = await e.reply(segment.face(obj[msg].list[randomIndex].id))
        }//face消息处理完毕

        //以下为video消息的处理
        if (matchType == "video") {
            sendmsg = await e.reply(segment.video(face.videoFile))
        }//video消息处理完毕

        // 获取机器人回复消息的所有ID
        logger.info(`[表情回复] sendmsg对象: ${JSON.stringify(sendmsg)}`)
        let replyIds = []
        if(sendmsg?.data?.message_id){
            replyIds.push(String(sendmsg.data.message_id))
        }
        if(sendmsg?.message_id){
            replyIds.push(String(sendmsg.message_id))
        }
        if(sendmsg?.rand){
            replyIds.push(String(sendmsg.rand))
        }
        if(sendmsg?.real_id){
            replyIds.push(String(sendmsg.real_id))
        }
        if(sendmsg?.seq){
            replyIds.push(String(sendmsg.seq))
        }
        if(sendmsg?.time){
            replyIds.push(String(sendmsg.time))
        }
        replyIds = [...new Set(replyIds)]
        logger.info(`[表情回复] 机器人回复消息的ID: ${JSON.stringify(replyIds)}`)

        if ("rand" in face){
            // 将新的ID添加到rand数组中
            for(let id of replyIds){
                if(id && !face["rand"].includes(id)){
                    if(face["rand"].length >= 10){
                        face["rand"].shift()
                    }
                    face["rand"].push(id)
                }
            }
        }else{
            face["rand"] = replyIds
        }
        tool.JsonWrite(obj, faceFile)
        return false
    }
}

//监听模式,废弃
// Bot.on?.("message", async(e) => {
    
// })


//****以下为相关方法****\\
//返回表情添加的状态
async function isAddOpen() {
    let Cfg = await tool.readyaml('./plugins/San-plugin/config/config.yaml')
    const TorF = Cfg.add_face
    if (TorF) {
        return true
    }else{
        return false
    }
}

//返回表情添加仅主人的状态
async function isAddOnlyOpen() {
    let Cfg = await tool.readyaml('./plugins/San-plugin/config/config.yaml')
    const TorF = Cfg.add_onlyMaster

    if (TorF) {
        return true
    }else{
        return false
    }
}

//返回表情群组分离的状态
async function isFaceGroupApart() {
    let Cfg = await tool.readyaml('./plugins/San-plugin/config/config.yaml')
    const TorF = Cfg.face_groupApart

    if (TorF) {
        return true
    }else{
        return false
    }
}



/**
 * 处理用户发送的表情消息
 * @param {Object} e - 用户消息对象,请传this.e
 * @param {string} tag - 表情的tag标签
 */
async function HandelFace(e,tag,isglobal) {
    let msgtype
    if(e.message.length > 1){
        msgtype = "other"
    }else{
        msgtype = e.message[0].type;//用户消息类型
    }
    let Rand//获取消息随机数
    let messageIds = []
    if(e.message_id !== undefined && e.message_id !== null){
        messageIds.push(String(e.message_id))
    }
    if(e.rand !== undefined && e.rand !== null){
        messageIds.push(String(e.rand))
    }
    if(e.real_id !== undefined && e.real_id !== null){
        messageIds.push(String(e.real_id))
    }
    if(e.seq !== undefined && e.seq !== null){
        messageIds.push(String(e.seq))
    }
    if(e.time !== undefined && e.time !== null){
        messageIds.push(String(e.time))
    }
    messageIds = [...new Set(messageIds)]
    logger.info(`[表情添加] 提取到的消息ID: ${JSON.stringify(messageIds)}`)
    logger.info(`[表情添加] e.message_id=${e.message_id}, e.rand=${e.rand}, e.real_id=${e.real_id}, e.seq=${e.seq}, e.time=${e.time}`)
    Rand = messageIds[0]
    let date = await tool.readFromJsonFile(faceFile)//获取所有表情json
    let BascialDate = {
            'user_id': e.user_id,
            'time': tool.convertTime(Date.now(), 0),
            'belong': (e.isGroup && !isglobal) ? [e.group_id] : [],//判断是否为群组消息
            'rand': messageIds,
    }

    //对iamge类型消息处理
    if (msgtype == "image") {
        BascialDate.type = "image"
        BascialDate.url = e.message[0].url//添加图片链接,腾讯图链似乎一段时间后会过期
        //image下载至本地
        let imageFile = `./data/San/face/images/${tool.getId()}.gif`//构造表情图片id
        await tool.downloadImage(BascialDate.url, imageFile)
        BascialDate.imageFile = imageFile
    }
    //对video类型消息处理
    if (msgtype == "video") {
        BascialDate.type = "video"
        let videoFile = `./data/San/face/images/${tool.getId()}.mp4`//构造视频文件id
        let videoElem = e.message[0]
        // 确保 self_id 可用
        if (!videoElem.self_id && e.self_id) videoElem.self_id = e.self_id
        let ok = await tool.downloadVideo(e, videoElem, videoFile)
        if (!ok) {
            e.reply(`- ${tag} -视频下载失败`)
            return
        }
        BascialDate.videoFile = videoFile
    }
    //对forward类型消息处理
    if (msgtype == "forward" || msgtype == "json") {
        //let forwardMsg = []
        //let data = common.makeForwardMsg(e, e.message[0]['content'], `聊天记录`);
        let data = await tool.getFMsg(e)
        BascialDate.type = "forward"//非iamge消息存源码
        BascialDate.msg = data//存消息数组 未进行制作合并转发
    }
    //对非iamge类型消息处理
    if (msgtype !== "image" && msgtype !== "video" && msgtype !== "forward" && msgtype !== "json") {
        for(let i of e.message){
            if(i.type == "image"){
            let imageFile = `./data/San/face/images/${tool.getId()}.gif`//构造表情图片id
            await tool.downloadImage(i.url, imageFile)
            i.file = imageFile
            }
        }
        BascialDate.type = "other"//非iamge消息存源码
        BascialDate.msg = e.message//存消息源码
    }

    // if (msgtype == "json") {

    //     const innerData = JSON.parse(e.message[0].data);
    //     const resid = innerData.meta.detail.resid;
    //     let data = await e.friend.getForwardMsg(resid)
    //     logger.info(data)
    //     //let dataBuffer = await e.group._newDownloadMultiMsg(resid,2)
    //     // let data = Bot.icqq.core.pb.decode(dataBuffer).toJSON()
    //     // logger.info(JSON.stringify(data, null, 2))
    //     //logger.info(dataBuffer.toString("hex"))
    //     logger.info("-----------------------------------")
    //     //logger.info(dataBuffer)
    // }
 


    //存入表情对象
    if (date[tag]) {
        date[tag].list.push(BascialDate)//直接push到tag的子列表
    }else{
        date[tag] = {
            'list': [BascialDate]
        }
    }

    //存入表情json文件
    tool.JsonWrite(date, faceFile)

    e.reply(`- ${tag} -添加成功`)

}

async function getFaceData() {
    const data = await tool.readFromJsonFile(faceFile)
    return data
}

/**
 * 获取消息转图的html
 * @param data 包含多个表情的数组
 * @param tag 触发词
 * @returns 返回html字符串
 */
function msgToImg(data,tag) {
    let html = fs.readFileSync('./plugins/San-plugin/resources/html/msg.html', 'utf8');
    let msg_item = ``
    let newData = []
    for(let i of data){
        if(i.type == "forward"){
            for(let t of i.msg){
                const sender_id = t.user_id
                const nickname = t.nickname
                    newData.push({
                        "sender_id": sender_id,
                        "nickname": nickname,
                        "type": "other",
                        "msg": t.message,
                        "time": tool.convertTime(t.time * 1000,0)
                        // "imagefile": m.data?.file || m?.file,
                        // "text": m.data?.text || m?.text
                    })
            }
            continue
        }
        newData.push(i)
    }
    for(let i of newData) {
        let sender_id = i.sender_id || Bot.info.user_id || Object.keys(Bot)[0] || "0000"
        let nickname = i.nickname || Bot.info.nickname || Bot[sender_id]?.sdk?.nickname || "匿名用户"
        let msg_text_wrap = ``
        switch(i.type){
            case "image":
                msg_text_wrap += `<img src="${path.resolve(i.imageFile)}" class="msg-img"/>\n`
            break
            case "text":
                msg_text_wrap += `<div class="msg-text">${i.text}</div>\n`
            break
            case "json":
            case "other":
                    for(let t of i.msg) {
                        switch(t.type){
                            case "image":
                                msg_text_wrap += `<img src="${path.resolve(t.data?.file || t.file)}" class="msg-img"/>\n`
                            break
                            case "text":
                                msg_text_wrap += `<div class="msg-text">${t.data?.text || t.text}</div>\n`
                            break
                        }
                    }

        }
        msg_item += `
            <div class="msg-item">
                <div class="avatar-wrap">
                    <img src="https://q1.qlogo.cn/g?b=qq&nk=${sender_id}&s=100" class="avatar" />
                </div>
                <div class="msg-content">
                    <div class="msg-header">
                        <span class="user-name">${nickname}</span>
                        <span class="msg-time">${i.time}</span>
                    </div>
                    <div class="msg-text-wrap">
                        ${msg_text_wrap}
                    </div>
                </div>
            </div>\n`
    }
    html = html.replace("Tag",tag)
    html = html.replace("Time",tool.convertTime(Date.now(),0))
    html = html.replace("Target",msg_item)
    return html
}