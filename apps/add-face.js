import * as tool from '../models/tool.js';
import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';
import common from '../../../lib/common/common.js';
let tag

//let code//-1:该用户正在添加消息 一个已知小bug，先鸽...
let faceFile = "./plugins/San-plugin/resources/face/userface.json"
export class San_AddFace extends plugin {
  constructor () {
    super({
      name: 'San-plugin表情功能',
      dsc: 'San-plugin表情功能',
      event: 'message', //发出提示信息
      priority: '49999', //优先级
      rule: [{
        reg: '^#text$',
        fnc: 'text'
        // 执行方法
      },
        {
          reg: '^#添加.*$',
          fnc: 'add'
          // 执行方法
        },
        {
          reg: '^#(散|san|San)设置表情添加(开启|关闭)$',
          fnc: 'addswitch'
          // 执行方法
        },
        {
          reg: '(\d*)?(.*)',
          fnc: 'getText',
        },
      ]
    })

  }
  async getText (e){
    if (!fs.existsSync(faceFile)) {
      return
    }
    let addcode = await returnaddcode() //0关 1开
    logger.info(addcode)
    if (addcode == 0) {
      return
    }
    let msg = e.msg
    let msgtype = e.message[0].type
    const obj = await tool.readFromJsonFile(faceFile)
    let keys = Object.keys(obj)
    //logger.info(keys)
    if (keys.includes(msg)) {
      logger.info(`San-plugin 匹配到 ${msg}`)
      //logger.info(msgtype)
    } else {
      //logger.info(`San-plugin 未匹配到 ${msg}`)
      //logger.info(e)
      return
    }
    const randomIndex = Math.floor(Math.random() * obj[msg].list.length);
    const matchType = obj[msg].list[randomIndex].type
  
    //以下为iamge消息的处理
    if (matchType == "image") {
      e.reply([segment.image(obj[msg].list[randomIndex].imageFile)])
    }//image消息处理完毕
  
    //以下下为text消息的处理
    if (matchType == "text") {
      let type; // 声明变量
      e.reply(obj[msg].list[randomIndex].content)
    }//text消息处理完毕
  }




  async addnext (e) {

    let msg = this.e.msg
    let msgtype = this.e.message[0].type

    //以下为text类型消息的处理
    if (msgtype == 'text') {
      //logger.info([tool.convertTime(Date.now(),0),e.message[0].type,msg,e.user_id])
      let date = {}
      if (fs.existsSync(faceFile)) {
        date = await tool.readFromJsonFile(faceFile)
      } else {
        date[`${tag}`] = {

          'list': [{
            'user_id': e.user_id,
            'time': tool.convertTime(Date.now(), 0),
            'type': e.message[0].type,
            'content': msg
          },
          ]
        }
      }//判断是否有userface文件,若无则进行初始化
      if (date[tag] == undefined) {
        date[`${tag}`] = {

          'list': [{
            'user_id': e.user_id,
            'time': tool.convertTime(Date.now(), 0),
            'type': e.message[0].type,
            'content': msg
          },
          ]
        }
        //判断是否存在同名tag,存在则使用初始化方法，不存在则使用push方法
      } else {

        date[tag].list.push(
          {
            'user_id': e.user_id,
            'time': tool.convertTime(Date.now(), 0),
            'type': e.message[0].type,
            'content': msg
          }
        )

      }
      tool.JsonWrite(date, faceFile)
      e.reply(`${tag} 添加成功`)
      this.finish('addnext')
    }//text类型消息处理结束



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
      this.finish('addnext')
    }//image类型消息处理完毕

    //以下为json类型消息处理
    if (msgtype == "json") {
      e.reply("json类型消息还没写,先鸽着.....")
      this.finish('addnext')
      return
    }//json类型消息处理完毕

    //以下为face类型消息处理
    if (msgtype == "face") {
      e.reply("face类型消息还没写,先鸽着.....")
      this.finish('addnext')
      return
    }//face类型消息处理完毕







  }

  async add (e) {
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
    let reg = /^#添加\s*(.*)$/;

    let match = msg.match(reg)
    //logger.info(match)
    if (match[1] == '') {
      this.finish('addnext')
      e.reply("tag禁止为空!")
      return
    } else {
      tag = match[1] //获取到添加tag
      e.reply("请发送添加内容")
    }

  }

  async addswitch (e) {
    if(!tool.ismaster(e.user_id)){
      e.reply('你不是我的主人哦')
      return false
    }

    let reg = /^#(散|san|San)设置表情添加(开启|关闭)$/
    let str = e.msg
    const match = str.match(reg)
    //logger.info(match)
    const tag = match[2]
    if (tag == "开启") {
      let url = 'https://sanluo.top:8888/down/mhFU8AemzgWZ.js'
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

    if (tag == "关闭") {
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
  logger.info(code)
  logger.info(Cfg)
  if (code == "open") {
    return 1
  }
  if (code == "closed") {
    return 0
  }
}

