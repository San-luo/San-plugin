import * as tool from '../models/tool.js';
import { getBrowserInstance } from '../models/puppeteer.js';
const cfg_priority = await tool.set_priority("weather")

export class San_Weather extends plugin {
    constructor () {
      super({
        name: 'San_weather',
        dsc: '通过截取和风天气页面获取天气信息',
        event: 'message',//发出提示信息
        priority: cfg_priority,//优先级
        rule: [
            { 
          reg: '^#?(.*)天气$',
          fnc: 'weather_info'
                // 执行方法
            },
            { 
            reg: '^#?(.*)空气(质量)?(排行)?$',
            fnc: 'air_info'
                  // 执行方法
            }     
    ]
      })
  
    }
    async weather_info (e){
        let state = false//执行状态
        let str = e.msg
        let reg = /^#?(.*)天气$/
        let match = str.match(reg)
        //logger.error(match)
        switch(match[1]){
          case ``:
            await locationWeather(e,"北京")
            state = true;
            break;
          case `极端`:
            await JiduanWeather(e)
            state = true;
            break;
        }
        if(state == false){
          await locationWeather(e,match[1])
        }

        //指定地区的天气截图
        async function locationWeather(e,location) {
          const url = await tool.location_url(location,"weather")//网站url
          const selector = ".current-weather__bg"//选择器
          // 启动浏览器
          const browser = await getBrowserInstance();
          //const browser = await puppeteer.launch({ headless: true, args: ['--disable-setuid-sandbox'] });
          // 新建一个页面
          const page = await browser.newPage();
          // 设置页面大小
          await page.setViewport({ width: 600, height: 900 });
      
          // 打开HTML文件
          await page.goto(url, { waitUntil: 'networkidle2' });
          
          await page.waitForSelector(selector, { timeout: 5000 }); // 设置最大等待时间为5秒

          // 获取特定容器的边界
          const element_1 = await page.$(selector); 
          const boundingBox_1 = await element_1.boundingBox();

          const element_2 = await page.$(".c-city-weather-hour24"); 
          const boundingBox_2 = await element_2.boundingBox();
      
          const clip = {
            x: boundingBox_1.x-10,
            y: boundingBox_1.y - 50,
            width: boundingBox_2.width + 15,
            height: (boundingBox_2.height + boundingBox_1.height + 60),
          };

          // 将页面渲染为图片并保存到本地
          const screenshot = await page.screenshot({ clip, encoding: 'base64' });
          await page.screenshot({
              fullPage: false,
              clip: clip ,// 使用传递进来的裁剪区域
              type: 'jpeg',
              quality: await tool.set_otherCfg(`imgQuality`) ,// JPEG图片的质量，范围是1到100
              omitBackground: true, // 防止背景颜色影响透明度
              encoding: 'base64'
          });
      
          // 发送图片
          e.reply(segment.image(`base64://${screenshot}`))
      
          
          // 关闭页面
    await page.close();
      }


      //极端天气列表的截图
      async function JiduanWeather(e) {
        const url = "https://www.qweather.com/weather/"
        const selector = ".c-city-warning-around"//选择器
        // 启动浏览器
        const browser = await getBrowserInstance();
        //const browser = await puppeteer.launch({ headless: true, args: ['--disable-setuid-sandbox'] });
        // 新建一个页面
        const page = await browser.newPage();

        // 设置地理位置
        await page.setGeolocation({ latitude: 32.0500, longitude: 118.7833 }); // 北京市的经纬度
        // 允许地理定位权限
        await page.setBypassCSP(true); // 必须先绕过内容安全策略
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'geolocation', {
                value: {
                    getCurrentPosition: (success) => {
                        success({
                            coords: {
                                latitude: 32.0500,
                                longitude: 118.7833,
                                accuracy: 100
                            }
                        });
                    },
                    watchPosition: () => {}
                }
            });
        });

        // 设置页面大小
        await page.setViewport({ width: 600, height: 900 });
    
        // 打开HTML文件
        await page.goto(url, { waitUntil: 'networkidle2' });
        
        await page.waitForSelector(selector, { timeout: 5000 }); // 设置最大等待时间为5秒

        // 获取特定容器的边界
        const element_1 = await page.$(selector); 
        const boundingBox_1 = await element_1.boundingBox();

    
        const clip = {
          x: boundingBox_1.x,
          y: boundingBox_1.y,
          width: boundingBox_1.width ,
          height: boundingBox_1.height,
        };

        // 将页面渲染为图片并保存到本地
        const screenshot = await page.screenshot({ clip, encoding: 'base64' });
        await page.screenshot({
            fullPage: false,
            clip: clip ,// 使用传递进来的裁剪区域
            type: 'jpeg',
            quality: await tool.set_otherCfg(`imgQuality`) ,// JPEG图片的质量，范围是1到100
            omitBackground: true, // 防止背景颜色影响透明度
            encoding: 'base64'
        });
    
        // 发送图片
        e.reply(segment.image(`base64://${screenshot}`))
    
        
        // 关闭页面
    await page.close();
    }



    }

    async air_info (e){
    
      let state = false//执行状态
      let str = e.msg
      let reg = /^#?(.*)空气(质量)?(排行)?$/
      let match = str.match(reg)
      //logger.error(match)

if(match[3] === undefined){
      switch(match[1]){
        case ``:
          await locationAir(e,"北京")
          state = true;
          break;
        default:
          await locationAir(e,match[1])
          state = true;
          break;
      }  
}else{
  switch(match[1]){
    case ``:
      await AirRank(e,"北京")
      state = true;
      break;
    default:
      await AirRank(e,match[1])
      state = true;
      break;
  } 

}
      //指定地区的空气截图
      async function locationAir(e,location){
        const url = await tool.location_url(location,"air")//网站url
        logger.info(url)
        const selector = ".c-city-air-forecast"//选择器
        // 启动浏览器
        const browser = await getBrowserInstance();
        //const browser = await puppeteer.launch({ headless: true, args: ['--disable-setuid-sandbox'] });
        // 新建一个页面
        const page = await browser.newPage();
        // 设置页面大小
        await page.setViewport({ width: 600, height: 1300 });
    
        // 打开HTML文件
        await page.goto(url, { waitUntil: 'networkidle2' ,timeout: 10000});
        
        await page.waitForSelector(selector, { timeout: 5000 }); // 设置最大等待时间为5秒

        // 获取特定容器的边界
        // const element_1 = await page.$('.c-submenu__location'); //地区名称
        // const boundingBox_1 = await element_1.boundingBox();

        // const element_2 = await page.$(".c-city-air-current.d-flex.justify-content-between.align-items-center");//空气质量 
        // const boundingBox_2 = await element_2.boundingBox();

        // const element_3 = await page.$(".c-city-air-forecast");//空气预报
        // const boundingBox_3 = await element_2.boundingBox();
    
        const clip = {
          x: 0   ,
          y: 100 ,
          width: 600,
          height: 1250,
        };

        // 将页面渲染为图片并保存到本地
        const screenshot = await page.screenshot({ clip, encoding: 'base64' });
        await page.screenshot({
            fullPage: false,
            clip: clip ,// 使用传递进来的裁剪区域
            type: 'jpeg',
            quality: await tool.set_otherCfg(`imgQuality`) ,// JPEG图片的质量，范围是1到100
            omitBackground: true, // 防止背景颜色影响透明度
            encoding: 'base64'
        });
    
        // 发送图片
        e.reply(segment.image(`base64://${screenshot}`))
    
        
        // 关闭页面
      await page.close();
      }
      

      async function AirRank(e,location){
        const url = await tool.location_url(location,"air")//网站url
        logger.info(url)
        const selector = ".c-city-air-rank"//选择器
        // 启动浏览器
        const browser = await getBrowserInstance();
        //const browser = await puppeteer.launch({ headless: true, args: ['--disable-setuid-sandbox'] });
        // 新建一个页面
        const page = await browser.newPage();
        // 设置页面大小
        await page.setViewport({ width: 600, height: 900 });
    
        // 打开HTML文件
        await page.goto(url, { waitUntil: 'networkidle2' ,timeout: 10000});
        
        await page.waitForSelector(selector, { timeout: 5000 }); // 设置最大等待时间为5秒

        //获取特定容器的边界
        const element_1 = await page.$('.c-city-air-rank'); //地区名称
        const boundingBox_1 = await element_1.boundingBox();

        // const element_2 = await page.$(".c-city-air-current.d-flex.justify-content-between.align-items-center");//空气质量 
        // const boundingBox_2 = await element_2.boundingBox();

        // const element_3 = await page.$(".c-city-air-forecast");//空气预报
        // const boundingBox_3 = await element_2.boundingBox();
    
        const clip = {
          x: boundingBox_1.x   ,
          y: boundingBox_1.y ,
          width: boundingBox_1.width,
          height: boundingBox_1.height,
        };

        // 将页面渲染为图片并保存到本地
        const screenshot = await page.screenshot({ clip, encoding: 'base64' });
        await page.screenshot({
            fullPage: false,
            clip: clip ,// 使用传递进来的裁剪区域
            type: 'jpeg',
            quality: await tool.set_otherCfg(`imgQuality`) ,// JPEG图片的质量，范围是1到100
            omitBackground: true, // 防止背景颜色影响透明度
            encoding: 'base64'
        });
    
        // 发送图片
        e.reply(segment.image(`base64://${screenshot}`))
    
        
        // 关闭页面
      await page.close();
      }
    }
}


