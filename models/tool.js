import yaml from 'js-yaml';
import fsS from 'fs';
const fs = fsS.promises;
import path from 'path';
import lodash from "lodash"
import puppeteer from 'puppeteer';
import axios from 'axios';
import common from '../../../lib/common/common.js';
import config from '../../../lib/config/config.js'
import * as Packet from './Packet.js'
/**
 * 获取主人qq号
 * 返回number 类型
 */
export function masterQQ(){
    // // 读取YAML文件
    // const fileContents = await fs.readFile('./config/config/other.yaml', 'utf8');
    // // 将YAML内容解析为JavaScript对象
    // const data = yaml.load(fileContents);
    // // 获取键的值
    // const keyValue = data.masterQQ; 
    // // 转换为字符串类型 
    // const masterqq = keyValue[0]
    // //.toString()
    for(let i of config.masterQQ){
      if(!isNaN(Number(i))){
        return Number(i)
      }
    }
    //返回首个主人QQ号
}


/**
 * 这是一个判断输入的QQ是否在配置文件中的masterQQ列表中的函数。如果输入的QQ在masterQQ列表中，返回true；否则，返回false。
 *
 * @param {Number} qq - 需要判断的QQ号码。
 * @return {Boolean} 如果输入的QQ在masterQQ列表中，返回true；否则，返回false。
 */
export function ismaster(qq){
  // const fileContents = await fs.readFile('./config/config/other.yaml', 'utf8');
  //   // 将YAML内容解析为JavaScript对象
  //   const data = yaml.load(fileContents);
    // 获取键的值
    const keyValue = config.masterQQ; 
    if(keyValue.includes(qq)){
      return true
    }else{
      return false
    }
}

/**
 * 截图并发送
 * @param e 传入事件对象e
 * @param gopath 截图的html文件或网址URL(可不含协议头)
 * @param outpath 图片生成路径,可选
 */
export async function screenshot(e, gopath, clipRegion, outpath = "./plugins/San-plugin/resources/img/screenshot.jpeg") {

    let url;

    // 检查是否是一个文件路径
    if (await fs.access(gopath) && await fs.lstat(gopath).isFile()) {
        // 如果是文件路径，则直接使用该路径
        url = `file://${path.resolve(gopath)}`;
    } else {
        // 如果是一个url，则直接使用该url,自动补全协议头
        url = gopath.startsWith('http://') || gopath.startsWith('https://') ? gopath : `http://${gopath}`;
    }

    // 启动浏览器
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    //const browser = await puppeteer.launch({ headless: true, args: ['--disable-setuid-sandbox'] });
    // 新建一个页面
    const page = await browser.newPage();
    // 设置页面大小
    await page.setViewport({ width: 400, height: 900 });

    // 打开HTML文件
    await page.goto(url, { waitUntil: 'networkidle2' });

    //获取图像质量配置信息
    const Set_Quality = await set_otherCfg(`imgQuality`)

    // 将页面渲染为图片并保存到本地
    await page.screenshot({
        path: outpath,
        fullPage: false,
        clip: clipRegion ,// 使用传递进来的裁剪区域
        type: 'jpeg',
        quality: Set_Quality ,// JPEG图片的质量，范围是1到100
        omitBackground: true // 防止背景颜色影响透明度
    });

    // 发送图片
    await e.reply(segment.image(outpath));

    // 关闭浏览器
    browser.close();
    // 异步删除文件
    try {
        await fs.unlink(outpath);
    } catch (err) {
        logger.error(`——————San-plugin报错————`);
        logger.error(err);
    }
}


/**
 *  生成裁剪区域参数,用于传递给screenshot()
 * @param  x 裁剪区域左上角的x坐标
 * @param  y 裁剪区域左上角的y坐标
 * @param  width 截图宽度
 * @param  height 截图高度
 */
export function clipRegion(x, y, width, height) {
        return { x, y, width, height };
}

/**
 *  生成和风天气的对应地区URL
 * @param  location 地区名称,支持中英文模糊查询
 * @param  type 信息类型,可选: weather, air
 * @returns 返回和风天气的对应地区URL
 */
export async function location_url(location,type) {
    try {
        // 使用fetch方法向指定的URL发送请求，并等待响应
        const response = await fetch(`https://geoapi.qweather.com/v2/city/lookup?location=${location}&key=257d5e191bd74b9091909d3bceb9c00a`);
        // 将响应的数据解析为JSON格式
        const data = await response.json();
        // 从解析后的数据中获取第一个位置的ID
        const firstLocationId = data.location[0].id;
        // 根据获取到的位置ID构造对应的天气页面URL
        
        const location_url = `https://www.qweather.com/${type}/${firstLocationId}.html`
        // 返回构造好的URL
        return location_url;
    } catch (error) {
        // 如果发生错误，打印错误信息
        logger.error('Error fetching data:', error);
    }
}


/**
 * 这是一个异步读取并解析YAML文件的函数。
 *
 * @param {String} filePath - 需要读取的YAML文件的路径。
 * @return {Promise} 返回一个Promise对象。
 */

export async function readyaml(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    if (data.trim() === '') {
      //logger.warn('yaml文件为空');
      return {}; // 返回一个空对象
    }
    return yaml.load(data);
  } catch (err) {
    logger.error('读取或解析yaml错误', err);
    throw err; // 抛出错误以便调用者处理
  }
}


  /**
 * 将JavaScript对象转换为YAML格式并保存到指定路径的文件中。
 *
 * @param {Object} obj - 要序列化的JavaScript对象。
 * @param {string} filePath - 目标YAML文件的完整路径。
 * @param {Object} [options] - 可选参数，传递给yaml.dump以控制输出格式。
 */
export async function objectToYamlFile(obj, filePath, options = {}) {
  try {
      // 将对象转换为YAML字符串
      const yamlString = yaml.dump(obj, options);

      // 确保目录存在（如果需要）
      const dir = path.dirname(filePath);
      if (!(await fs.access(dir))) {
          await fs.mkdir(dir, { recursive: true });
      }

      // 写入YAML字符串到文件
      await fs.writeFile(filePath, yamlString, 'utf8');

  } catch (error) {
      logger.error(`将对象转换为YAML文件时出错:`, error.message);
      throw error;
  }
}

    /**
     * 这是一个异步函数，用于设置优先级。
     *
     * @param {String} name - 需要查找的name属性值。
     * @return {String} 返回找到的name属性值，如果没有找到则返回undefined。
     */
  export async function set_priority(name){
      const obj = await readyaml('./plugins/San-plugin/config/priority.yaml');
      const priority = obj[name];
      return priority;
  }


  export async function set_otherCfg(name){
    const obj = await readyaml('./plugins/San-plugin/config/config.yaml');
    const CfgInfo = obj[name]
    return CfgInfo;
}



/**
 * 这是一个时间转换函数，可以将时间戳转换为格式化的时间，也可以将格式化的时间转换为时间戳。
 *
 * @param {Number} input - 需要转换的时间，可以是时间戳，也可以是格式化的时间字符串。
 * @param {Number} direction - 转换的方向，0表示将时间戳转换为格式化的时间，1表示将格式化的时间转换为时间戳。
 * @return {String/Number} 返回转换后的结果。如果direction为0，返回的是格式化的时间字符串；如果direction为1，返回的是时间戳。如果输入的参数不符合要求，会记录错误日志并返回undefined。
 */
export function convertTime(input, direction) {
  if (direction == 0) {
      // 将时间戳转换为格式化的时间
      const date = new Date(input);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');

      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } else if (direction == 1) {
      // 将格式化的时间转换为时间戳
      const parts = input.split(' ');
      const dateParts = parts[0].split('-');
      const timeParts = parts[1].split(':');

      const date = new Date(
          parseInt(dateParts[0], 10),
          parseInt(dateParts[1], 10) - 1, // 月份是从0开始的
          parseInt(dateParts[2], 10),
          parseInt(timeParts[0], 10),
          parseInt(timeParts[1], 10),
          parseInt(timeParts[2], 10)
      );

      return date.getTime();
  } else {
      logger.error('San-plugin: 错误的时间转换,请检查时间格式是否出错 ');
  }
}

/**
 * 这是一个将对象写入JSON文件的函数。对象转换为JSON格式并写入指定的文件。
 *
 * @param {Object} obj - 需要被写入文件的对象。
 * @param {String} filePath - 目标文件的完整路径。
 */
export async function JsonWrite(obj, filePath,creat = false) {
  try {
    if (creat) {
      await checkPath(filePath)
    }
    await fs.writeFile(filePath, JSON.stringify(obj, null, 2)); // 写入文件
  } catch (err) {
    if (err.code !== 'EEXIST') { // 如果不是目录已存在的错误，则记录错误
      logger.error(err);
    }
  }
}



/**
 * 这是一个异步读取JSON文件并解析为对象的函数。如果读取或解析过程中出现错误，会抛出异常并在日志中记录错误信息。
 *
 * @param {String} filePath - 需要读取的JSON文件的路径。
 * @return {Promise<Object>} 返回一个Promise对象，该对象在成功时解析为从JSON文件中读取并解析的对象，失败时则抛出错误。
 */
export async function readFromJsonFile(filePath,create = false) {
        if(create){
            await checkPath(filePath)
      }
  try {

    // 读取文件内容
    const data = await fs.readFile(filePath, 'utf8');
    
    if (data === '') {
      //logger.warn('json文件为空');
      return {}; // 或者你可以选择抛出一个新的错误
    }

    // 解析JSON数据
    const obj = JSON.parse(data);
    return obj;
  } catch (err) {
    if (err.code === 'ENOENT') {
      logger.error('json文件不存在:', err);
    } else if (err instanceof SyntaxError) {
      logger.error('json转换错误:', err);
    } else {
      logger.error('读取json文件时发生错误:', err);
    }
    throw err; // 将错误传递给调用者
  }
}






/**
 * 这是一个异步下载图片的函数。它使用axios库发送GET请求获取图片流，然后通过Node.js的文件系统(fs)模块将该流写入指定的目标路径。
 *
 * @param {String} url - 需要下载的图片的URL地址。
 * @param {String} targetPath - 图片保存的目标路径。
 * @return {Promise} 返回一个Promise对象，当图片成功下载并保存到指定路径时，Promise将被resolve；如果在下载或保存过程中发生错误，Promise将被reject。
 */
export async function downloadImage(url, targetPath) {
  try {
    const response = await axios({
      url,
      method: 'get',
      responseType: 'arraybuffer',
      timeout: 60000,
    });
    await fsS.promises.writeFile(targetPath, Buffer.from(response.data));
    logger.info(`文件已保存至 ${targetPath}`);
    return true;
  } catch (error) {
    logger.error(`下载文件失败: ${error.message}`);
    return false;
  }
}

/**
 * 这是一个同步读取并计算指定目录下文件数量的函数。如果目录存在，返回该目录下的文件数量；如果目录不存在或读取失败，则返回-1并打印错误信息。
 *
 * @param {String} directoryPath - 需要读取的目录路径。
 * @return {Number} 返回目录下的文件数量。如果目录不存在或读取失败，返回-1。
 */
export async function countFilesInDirectorySync(directoryPath) {
  try { 
    // 同步读取目录内容
    const files = await fs.readdir(directoryPath);
    // 返回文件数量
    return files.length;
  } catch (error) {
    if (error.code === 'ENOENT') {
      logger.error(`目录不存在： ${directoryPath}`);
    } else {
      logger.error(`读取目录失败： ${error.message}`);
    }
    return -1; //抛出异常
  }
}

export async function makeEmoji(txt){
  const outputPath = './plugins/San-plugin/resources/img/output-举牌.gif';
  
  // 加载图片
  const image = await loadImage('https://sanluo.top:8888/down/f2NQVSrrXVxB.jpeg');

  // 创建一个与输入图片大小相同的画布
  const canvas = createCanvas(image.width, image.height);
  const context = canvas.getContext('2d');

  // 将图片绘制到画布上
  context.drawImage(image, 0, 0, image.width, image.height);

  // 设置字体样式
  context.font = 'bold 30px Arial';
  context.fillStyle = 'black';
  context.textAlign = 'center'; // 文字居中显示
  context.fillText(txt, 350, 575); // 在图片底部中央添加文字

  // 保存修改后的图片
  const output = canvas.createJPEGStream();
   output.pipe(fsS.createWriteStream(outputPath));
  logger.info('Image with text created!');
}


/**
 * 这是一个异步函数，用于检查指定路径的文件夹是否存在。如果不存在，则创建该文件夹。
 *
 * @param {String} path - 需要检查的文件夹路径。
 * @return {Promise} 返回一个Promise对象
 */


export async function checkPath(targetPath) {
  try {
    // 获取文件或目录的状态信息
    await fs.stat(targetPath);
  } catch (err) {
    if (err.code === 'ENOENT') {
      // 如果路径不存在，判断是文件还是目录
      if (path.extname(targetPath)) {
        // 路径有扩展名，视为文件
        const dir = path.dirname(targetPath);
        try {
          // 确保文件所在的目录存在
          await fs.mkdir(dir, { recursive: true });
          await fs.writeFile(targetPath, '');
          logger.info('文件已创建:', targetPath); 
        } catch (writeFileErr) {
          logger.error('创建文件失败:', writeFileErr); 
        }
      } else {
        // 路径没有扩展名，视为目录
        try {
          await fs.mkdir(targetPath, { recursive: true });
          logger.info('目录已创建:', targetPath); 
        } catch (mkdirErr) {
          logger.error('创建目录失败:', mkdirErr); 
        }
      }
    } else {
      logger.error('获取状态失败:', err); 
    }
  }
}







/**
 * 用于获取引用消息
 * @param {Object} e - 需要处理的消息对象。
 * @param {Boolean} img - 可选参数，默认为false。如果为true，则只返回消息中的图片url；如果为false或未设置，则返回整个消息对象。
 * @return {Array/Object/Boolean} 返回source源码或图片url数组，如果消息中没有图片则返回false。
 */ 
export async function getsource(e, img = false) {
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
  if (!source && img == false) {
      return false    
  }
  if (img) {
    let imgArr = []
    if(!source){
      for (let i of e.message) {
        if (i.type == "image") {
        imgArr.push(i.url)
        }
    }
    }else{
        for (let i of source.message) {
        if (i.type == "image") {
        imgArr.push(i.url)
        }
    }
    }
    
  
    if(imgArr.length == 0) {
        return false
    }else{
        return imgArr
    }
}

  return source
}


/**
 * 这是一个异步函数，用于检查API的可用性。
 *
 * @param {String} url - 需要检查的API的URL。
 * @param {number} [timeout=5000] - 请求的超时时间，默认为5000毫秒
 * @return {Boolean} 如果API可用，返回true；如果API不可用或在请求过程中出现错误，返回false。
 */
export async function checkApi(url, timeout = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal
    });
    clearTimeout(timeoutId); // 清除超时定时器
    return response.ok;
  } catch (error) {
    if (error.name === 'AbortError') {
      logger.error('Request timed out');
    } else {
      logger.error('Error accessing the API:', error);
    }
    return false;
  } finally {
    clearTimeout(timeoutId); // 确保无论如何都清除定时器
  }
}

export function getId() {
  // 获取当前时间戳，并转换为36进制字符串
  const timePart = Date.now().toString(36);
  
  // 生成一个随机数，去掉前面的'0.'并转换为36进制字符串
  const randomPart = Math.random().toString(36).substr(2, 5); // 取前5位作为示例
  
  // 将两部分组合起来形成最终的唯一ID
  return timePart + randomPart;
}

export async function getText(e) {

  //存在回复消息时
  //@逻辑:
        //多个连续相同@只取其一
        //回复消息时存在一个隐藏的@引用者 在句首 删除文本@无用
        //每个@后会存在一个空格
  if(e?.getReply || e?.source){
    for(let i = 0; i < e.message.length;i++){
      let item = e.message[i]
      if(item.type == "at"){
        e.message.splice(i,1)
        break;
      }
    }
  }

  let text = ""
  for(let item of e.message){
    if(item?.type){
      switch(item.type){
        case "text":
          text += item.text
          break;
        case "at":
          text += `{at:${item.qq}}`
          break;
        case "face":
          text += `{face:${item.id}}`
          break;
        case "image":
          let MD5
          if(item?.md5){
            MD5 = item.md5//icqq协议
          }else{
            MD5 = item?.file.split('.').shift().toLowerCase();//ncqq协议
          }
          text += `{image:${MD5}}`//使用md5来标识图片
          break;
      }
    }
  }

  //前缀处理
  if(e.isGroup){
    let botStyle = await  readFromJsonFile("package.json")
    let groupCfg
    switch(botStyle.name){
      case "trss-yunzai" || "TRSS-Yunzai":
        let uin = (e?.self_id) ? e.self_id : Bot.uin.toString() 
        groupCfg = config.getGroup( uin, e.group_id)
        break;
      case "miao-yunzai" || "Miao-Yunzai":
        groupCfg = config.getGroup(e.group_id)
        break;
    }

    let Botalias = groupCfg.botAlias
    let alias = [...Botalias]
    alias.push(`{at:${e.self_id}}`)
    text = lodash.trimStart(text)
    if (!Array.isArray(alias)) alias = [alias]
    for (const name of alias) if (text.startsWith(name)) text = lodash.trimStart(text, name).trim()
    return text
  }
  return text
}


export async function getFMsg(e){
  // NC协议 
  if (e.message[0].type == "forward") {
    let data = []
    // let msg_data = e.isGroup ? (await e.group.getChatHistory(e.message_seq, 1)).pop() : (await e.friend.getChatHistory(e.message_seq, 1)).pop() 
    // logger.info(msg_data.message)
    let msg_data = e
    for(let item of msg_data.message[0]['content']){
        for(let i of item.message){
          if(i.type == "image"){
            let imageFile = `./data/San/face/images/${getId()}.gif`//构造表情图片id
            await downloadImage(i.data.url, imageFile)
            i.data.file = imageFile
          }
        }
        data.push({
        'message': item.message,
        'nickname': item.sender.nickname,
        'user_id': item.sender.user_id,
        'time': item.time
        })
    }
    return data
  }
  // IC协议
  if(e.message[0].type == "json"){
    let data = []
    const innerData = JSON.parse(e.message[0].data);
    const resid = innerData.meta.detail.resid;

    let msg = e.isGroup ? await e.group.getForwardMsg(resid) : await e.friend.getForwardMsg(resid)
    for(let item of msg){
      for(let i of item.message){
        if(i.type == "image"){
          let imageFile = `./data/San/face/images/${getId()}.gif`//构造表情图片id
          await downloadImage(i.url, imageFile)
          i.file = imageFile
        }
      }
      data.push({
        'message': item.message,
        'nickname': item.nickname,
        'user_id': item.user_id,
        'time': item.time
      })
    }
    return data
  }
  return false
}

export async function downloadVideo(e, videoElem, targetPath) {
  try {
    logger.info(`[San-plugin] 视频元素: type=${videoElem.type}, url=${videoElem.url}, file=${videoElem.file?.substring(0,50)}`)

    // 方案1: NapCat/OneBot - 直接使用 url 字段
    if (videoElem.url) {
      logger.info(`[San-plugin] 使用 NapCat/OneBot url 下载`)
      await common.downFile(videoElem.url, targetPath)
      logger.info(`[San-plugin] 视频下载完成: ${targetPath}`)
      return true
    }

    // 方案2: ICQQ 协议 - 使用 Packet 方法获取下载链接（需要 Bili-Plugin）
    const botId = videoElem.self_id || e.self_id || Object.keys(Bot)[0]
    const bot = Bot[botId]

    if (bot?.icqq || bot?.adapter?.name === 'ICQQ') {
      // 提取 fid
      let fid = videoElem.fid

      if (!fid) {
        logger.error('[San-plugin] 视频消息缺少 fid 字段')
        return false
      }

      logger.info(`[San-plugin] 使用 Packet 方法获取视频链接, fid: ${fid}`)

      try {
        // 构造请求 body（参考 Bili-Plugin/apps/Getrecordvideo.js）
        const body = {
          1: {
            1: {
              1: 1,
              2: 200,
            },
            2: {
              101: 2,
              102: 2,
              200: 2,
              202: {
                1: e.group_id,
              },
            },
            3: {
              1: 2,
            },
          },
          3: {
            1: {
              2: fid,
              3: 1,
            },
            2: {
              2: {},
            },
          },
        }

        // 调用 Packet 方法获取视频下载链接
        const rsp = await Packet.sendOidbSvcTrpcTcp(e, 'OidbSvcTrpcTcp.0x11EA_200', body)
        const rkey = rsp[3][1]

        if (!rkey) {
          logger.error('[San-plugin] 获取视频 rkey 失败')
          return false
        }

        // 构造下载 URL
        const videoUrl = `https://${rsp[3][3][1]}${rsp[3][3][2]}${rkey}`
        logger.info(`[San-plugin] 获取到视频下载链接: ${videoUrl}`)

        // 下载视频
        await common.downFile(videoUrl, targetPath)
        logger.info(`[San-plugin] 视频下载完成: ${targetPath}`)
        return true
      } catch (err) {
        logger.error('[San-plugin] Packet 方法获取视频链接失败:', err?.message || err)
        return false
      }
    }

    // 方案3: 尝试使用 file 字段作为 URL
    if (videoElem.file && String(videoElem.file).startsWith('http')) {
      logger.info(`[San-plugin] 使用 file 字段作为 URL 下载`)
      await common.downFile(videoElem.file, targetPath)
      logger.info(`[San-plugin] 视频下载完成: ${targetPath}`)
      return true
    }

    logger.error('[San-plugin] 视频消息缺少 url 或 file 字段，无法下载')
    return false
  } catch (error) {
    logger.error('[San-plugin] downloadVideo错误:', error?.message || error)
    return false
  }
}
