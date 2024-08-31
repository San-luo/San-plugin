import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import fsPromises from 'fs/promises';
import puppeteer from 'puppeteer';
import axios from 'axios';

/**
 * 获取主人qq号
 * 返回number 类型
 */
export function masterQQ(){
    // 读取YAML文件
    const fileContents = fs.readFileSync('./config/config/other.yaml', 'utf8');
    // 将YAML内容解析为JavaScript对象
    const data = yaml.load(fileContents);
    // 获取键的值
    const keyValue = data.masterQQ; 
    // 转换为字符串类型 
    const masterqq = keyValue[0]
    //.toString()
    //返回主人QQ号
    return masterqq
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
    await page.setViewport({ width: 400, height: 1000 });

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

    // 关闭浏览器
    await browser.close();

    // 发送图片
    await e.reply(segment.image(outpath));

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
     * 这是一个异步函数，用于设置优先级。
     *
     * @param {String} name - 需要查找的name属性值。
     * @return {String} 返回找到的name属性值，如果没有找到则返回undefined。
     */
  export async function set_priority(name){
      const obj = await readyaml('./plugins/San-plugin/config/config.yaml');
      const priority = obj.priority.find(item => item[name] !== undefined)?.[name];
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
