import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import fsPromises from 'fs/promises';
import puppeteer from 'puppeteer';
import axios from 'axios';
import common from '../../../lib/common/common.js';
import config from '../../../lib/config/config.js'

/**
 * 获取主人qq号
 * 返回number 类型
 */
export function masterQQ(){
    // // 读取YAML文件
    // const fileContents = fs.readFileSync('./config/config/other.yaml', 'utf8');
    // // 将YAML内容解析为JavaScript对象
    // const data = yaml.load(fileContents);
    // // 获取键的值
    // const keyValue = data.masterQQ; 
    // // 转换为字符串类型 
    // const masterqq = keyValue[0]
    // //.toString()
    let masterqq = config.masterQQ[0]
    //返回主人QQ号
    return masterqq
}


/**
 * 这是一个判断输入的QQ是否在配置文件中的masterQQ列表中的函数。如果输入的QQ在masterQQ列表中，返回true；否则，返回false。
 *
 * @param {Number} qq - 需要判断的QQ号码。
 * @return {Boolean} 如果输入的QQ在masterQQ列表中，返回true；否则，返回false。
 */
export function ismaster(qq){
  // const fileContents = fs.readFileSync('./config/config/other.yaml', 'utf8');
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
    if (fs.existsSync(gopath) && fs.lstatSync(gopath).isFile()) {
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
        await fs.promises.unlink(outpath);
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
 */
export async function location_url(location) {
    try {
        // 使用fetch方法向指定的URL发送请求，并等待响应
        const response = await fetch(`https://geoapi.qweather.com/v2/city/lookup?location=${location}&key=257d5e191bd74b9091909d3bceb9c00a`);
        // 将响应的数据解析为JSON格式
        const data = await response.json();
        // 从解析后的数据中获取第一个位置的ID
        const firstLocationId = data.location[0].id;
        // 根据获取到的位置ID构造对应的天气页面URL
        const location_url = `https://www.qweather.com/weather/${firstLocationId}.html`
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
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          console.error('读取yaml错误', err);
          reject(err);
          return;
        }
        try {
          const obj = yaml.load(data);
          resolve(obj);
        } catch (err) {
          console.error("yaml转换错误", err);
          reject(err);
        }
      });
    });
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
      if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
      }

      // 写入YAML字符串到文件
      fs.writeFileSync(filePath, yamlString, 'utf8');

  } catch (error) {
      console.error(`将对象转换为YAML文件时出错:`, error.message);
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
export function JsonWrite(obj, filePath) {
  try {
    const dirPath = path.dirname(filePath); // 获取文件所在目录
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true }); // 递归创建目录
    }
    fs.writeFileSync(filePath, JSON.stringify(obj, null, 2)); // 写入文件
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
export async function readFromJsonFile(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        logger.error('json文件读取:', err);
        reject(err);
        return;
      }
      try {
        const obj = JSON.parse(data);
        resolve(obj);
      } catch (parseErr) {
        logger.error('json转换错误:', parseErr);
        reject(parseErr);
      }
    });
  });
}


/**
 * 这是一个异步下载图片的函数。它使用axios库发送GET请求获取图片流，然后通过Node.js的文件系统(fs)模块将该流写入指定的目标路径。
 *
 * @param {String} url - 需要下载的图片的URL地址。
 * @param {String} targetPath - 图片保存的目标路径。
 * @return {Promise} 返回一个Promise对象，当图片成功下载并保存到指定路径时，Promise将被resolve；如果在下载或保存过程中发生错误，Promise将被reject。
 */
export async function downloadImage(url, targetPath) {
  axios({
    url,
    method: 'get',
    responseType: 'stream'
  }).then(response => {
    // 创建一个可写的流，它允许写入文件系统
    const writer = fs.createWriteStream(targetPath);
    // 管道流
    response.data.pipe(writer);
    // 监听管道完成事件
    writer.on('finish', () => {
      console.log(`文件已保存至 ${targetPath}`);
    });
    // 监听错误事件
    writer.on('error', error => {
      console.error(`下载文件失败: ${error.message}`);
    });
    // 如果响应结束前写入发生错误，则取消响应
    writer.on('close', () => {
      response.data.destroy();
    });
  }).catch(error => {
    console.error(`下载文件失败: ${error.message}`);
  });
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
    const files = fs.readdirSync(directoryPath);
    // 返回文件数量
    return files.length;
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error(`目录不存在： ${directoryPath}`);
    } else {
      console.error(`读取目录失败： ${error.message}`);
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
   output.pipe(fs.createWriteStream(outputPath));
  console.log('Image with text created!');
}


/**
 * 这是一个异步函数，用于检查指定路径的文件夹是否存在。如果不存在，则创建该文件夹。
 *
 * @param {String} path - 需要检查的文件夹路径。
 * @return {Promise} 返回一个Promise对象
 */
export async function checkFolder(path) {
          // 检查文件夹是否存在，如果不存在则创建
          if (!fs.existsSync(path)) {
            fs.mkdir(path, {
                recursive: true
            }, (err) => {
                if (err) {
                    console.error('创建文件夹失败:', err);
                }
            });
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
 * @return {Boolean} 如果API可用，返回true；如果API不可用或在请求过程中出现错误，返回false。
 */
export async function checkApi(url) {
  try {
    const response = await fetch(url);
    //console.log(response)
    return response.ok; // 返回true如果状态码是200-299，否则返回false
  } catch (error) {
    logger.error('Error accessing the API:', error);
    return false; // 如果有网络错误或其他异常情况，返回false
  }
}