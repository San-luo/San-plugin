import fsS from 'fs';
const fs = fsS.promises;
import * as tool from './models/tool.js';
import cfg from '../../lib/config/config.js';
import common from '../../lib/common/common.js';
import path from 'path';
//输出提示
logger.info('-------------------------')
logger.info('San-plugin加载中....')
logger.info('-------------------------')
//info可替换为: debug mark error
//检测路径是否是否创建
let FolderPath = [
  `./plugins/San-plugin/resources/poke/img`,
  `./plugins/San-plugin/resources/poke/api.yaml`,
  `./plugins/San-plugin/resources/face/userface.json`,
  `./plugins/San-plugin/resources/face/images`
]
for(let i of FolderPath){
  tool.checkPath(i)
}

  async function checkDependencies() {
    let packagejson = await tool.readFromJsonFile('./plugins/San-plugin/package.json')
    const dependencyList = Object.keys(packagejson.dependencies) 
    for (let i of dependencyList) {
      try {
        await import(`${i}`);
        //logger.info(`San-plugin: 依赖 ${i} 加载成功`);
      } catch (error) {
        logger.warn('-------San插件依赖缺失-----------');
        logger.warn(`请运行: pnpm install --filter=san-plugin`);
  
        let msg = `San-plugin依赖缺失,请运行:\npnpm install --filter=san-plugin`;
        await common.relpyPrivate(tool.masterQQ(), msg);
        logger.warn(`----------------------------`);
        return;
      }
    }
  }
  
  // 调用函数
  checkDependencies();

await setConfig('./plugins/San-plugin/config/default_config','./plugins/San-plugin/config')

await setConfig('./plugins/San-plugin/resources/AI/config/default_config','./plugins/San-plugin/resources/AI/config')

//加载插件
const files = await fsS.readdirSync('./plugins/San-plugin/apps').filter(file => file.endsWith('.js'))

let ret = []

files.forEach((file) => {
  ret.push(import(`./apps/${file}`))
})
ret = await Promise.allSettled(ret)

let apps = {}
for (let i in files) {
  let name = files[i].replace('.js', '')

  if (ret[i].status != 'fulfilled') {
      logger.error(`载入插件错误：${logger.red(name)}`)
      logger.error(ret[i].reason)
      continue
  }
  apps[name] = ret[i].value[Object.keys(ret[i].value)[0]]
}


export { apps }



/**
 * 异步设置配置文件函数
 * 该函数旨在确保当前配置目录下的配置文件与默认配置目录下的一致
 * 如果当前配置中缺少默认配置中的项，则会自动补充
 * 
 * @param {string} dfConfigDir 默认配置目录路径
 * @param {string} configDir 当前配置目录路径
 */
async function setConfig(dfConfigDir, configDir) {
  try {
    // 获取默认配置文件和当前配置文件列表
    const df_Cfg = new Set((await fs.readdir(dfConfigDir)).filter(file => file.endsWith('.yaml')));
    const Cfg = new Set((await fs.readdir(configDir)).filter(file => file.endsWith('.yaml')));

    // 获取未载入的配置文件
    const unload = [...df_Cfg].filter(x => !Cfg.has(x));

    // 如果有未载入的配置文件，将其从默认配置目录复制到当前配置目录
    if (unload.length !== 0) {
      for (let file of unload) {
        const src = path.join(dfConfigDir, file);
        const dest = path.join(configDir, file);

        try {
          await fs.copyFile(src, dest);
          logger.info(`San-plugin: 成功复制配置文件: ${file}`);
        } catch (err) {
          logger.error(`San-plugin: 配置文件复制过程中发生错误: ${err.message}`);
        }
      }
    }

    // 对比已载入的配置文件并更新缺失的键
    for (let file of Cfg) {
      const defaultConfigPath = path.join(dfConfigDir, file);
      const currentConfigPath = path.join(configDir, file);

      // 读取默认配置文件和当前配置文件内容
      let defaultConfig, currentConfig;

      try {
        defaultConfig = await tool.readyaml(defaultConfigPath);
        currentConfig = await tool.readyaml(currentConfigPath);
      } catch (error) {
        logger.warn(`San-plugin: 读取配置文件 ${file} 时发生错误，使用默认配置`);//即视为二者无差异,不进行更改
        defaultConfig = {};
        currentConfig = {};
      }

      let hasChanged = false
      // 合并默认配置中的键到当前配置中（如果当前配置中没有）
      Object.keys(defaultConfig).forEach(key => {
        if (!(key in currentConfig)) {
          //currentConfig[key] = defaultConfig[key];
          hasChanged = true
          logger.info(`San-plugin: 更新配置文件 ${file}`);
        }
      });
      //以默认cfg为模板(如注释)
        for(let key in currentConfig){
          defaultConfig[key] = currentConfig[key]
        }



      // 保存更新后的配置文件
      try {
        if(hasChanged){
          await tool.objectToYamlFile(defaultConfig, currentConfigPath);
        }
      } catch (error) {
        logger.error(`San-plugin: 保存配置文件 ${file} 时发生错误: ${error.message}`);
      }
    }
  } catch (error) {
    logger.error(`San-plugin: 发生了错误: ${error.message}`);
  }
}