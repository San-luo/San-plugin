import fsS from 'fs';
const fs = fsS.promises;
import * as tool from './models/tool.js';
import common from '../../lib/common/common.js';
import path from 'path';

// 初始化日志
logger.info('-------------------------');
logger.info('San-plugin加载中....');
logger.info('-------------------------');

//___迁移face文件位置(./plugins/San-plugin/resources/face -> ./data/San/face)___

// 路径配置
const config = {
  new: {
    faceDir: './data/San/face',
    get userFace() { return path.join(this.faceDir, 'userface.json'); },
    get imagesDir() { return path.join(this.faceDir, 'images'); }
  },
  old: {
    faceDir: './plugins/San-plugin/resources/face',
    get userFace() { return path.join(this.faceDir, 'userface.json'); },
    get imagesDir() { return path.join(this.faceDir, 'images'); }
  }
};

// 确保目录存在
const ensureDir = (dir) => {
  if (!fsS.existsSync(dir)) {
    fsS.mkdirSync(dir, { recursive: true });
    logger.info(`San-plugin:创建目录: ${dir}`);
  }
};

// 初始化空的userface.json文件
const initUserFaceFile = async () => {
  try {
    if (!fsS.existsSync(config.new.userFace)) {
      await tool.JsonWrite({}, config.new.userFace);
      logger.info(`San-plugin:已创建初始 userface.json 文件: ${config.new.userFace}`);
    }
  } catch (error) {
    logger.error('San-plugin:初始化userface.json失败:', error);
    throw error;
  }
};

// 递归删除目录
const deleteFolderRecursive = (dirPath) => {
  if (fsS.existsSync(dirPath)) {
    fsS.readdirSync(dirPath).forEach(file => {
      const curPath = path.join(dirPath, file);
      if (fsS.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fsS.unlinkSync(curPath);
      }
    });
    fsS.rmdirSync(dirPath);
    logger.info(`San-plugin:已删除目录: ${dirPath}`);
  }
};

// 更新JSON文件中的图片路径
const updateImagePaths = async () => {
  try {
    if (!fsS.existsSync(config.new.userFace)) {
      logger.warn('San-plugin:未找到新路径下的userface.json');
      return;
    }

    const faceData = await tool.readFromJsonFile(config.new.userFace);
    let updateCount = 0;

    Object.keys(faceData).forEach(tag => {
      faceData[tag].list.forEach(item => {
        if (item.imageFile) {
          // 标准化路径比较
          const normalizedPath = path.normalize(item.imageFile);
          const oldPathPrefix = path.normalize(config.old.imagesDir);
          
          if (normalizedPath.includes(oldPathPrefix)) {
            const relativePath = path.relative(config.old.faceDir, normalizedPath);
            item.imageFile = path.join(config.new.faceDir, relativePath);
            updateCount++;
          }
        }
      });
    });

    if (updateCount > 0) {
      await tool.JsonWrite(faceData, config.new.userFace);
      logger.info(`San-plugin:已更新 ${updateCount} 个表情文件的路径引用`);
    } else {
      logger.info('San-plugin:未检测到需要更新的路径引用');
    }
  } catch (error) {
    logger.error('San-plugin:更新图片路径时出错:', error);
  }
};

// 迁移旧表情数据
const migrateOldFiles = async () => {
  if (!fsS.existsSync(config.old.faceDir)) {
    logger.info('San-plugin:未检测到旧版表情数据');
    return;
  }

  logger.info('San-plugin:开始迁移旧版表情数据...');

  try {
    // 1. 迁移userface.json
    if (fsS.existsSync(config.old.userFace)) {
      const oldData = await tool.readFromJsonFile(config.old.userFace);
      
      // 合并新旧数据（新数据优先）
      let finalData = oldData;
      if (fsS.existsSync(config.new.userFace)) {
        const newData = await tool.readFromJsonFile(config.new.userFace);
        finalData = { ...oldData, ...newData };
      }
      
      await tool.JsonWrite(finalData, config.new.userFace);
      fsS.renameSync(config.old.userFace, config.old.userFace + '.bak');
      logger.info('San-plugin:userface.json 迁移完成');
    }

    // 2. 迁移图片文件
    if (fsS.existsSync(config.old.imagesDir)) {
      const files = fsS.readdirSync(config.old.imagesDir);
      let migratedCount = 0;
      
      for (const file of files) {
        const oldPath = path.join(config.old.imagesDir, file);
        const newPath = path.join(config.new.imagesDir, file);
        
        if (!fsS.existsSync(newPath)) {
          await fs.rename(oldPath, newPath);
          migratedCount++;
        }
      }
      
      logger.info(`San-plugin:已迁移 ${migratedCount}/${files.length} 个表情图片`);
    }

    // 3. 清理旧目录
    try {
      deleteFolderRecursive(config.old.faceDir);
    } catch (error) {
      logger.warn('San-plugin:清理旧目录失败:', error.message);
    }

    // 4. 更新路径引用
    await updateImagePaths();

    logger.info('San-plugin:表情数据迁移和更新完成');
  } catch (error) {
    logger.error('San-plugin:迁移过程中出错:', error);
  }
};

// 初始化文件系统
const initFileSystem = async () => {
  try {
    // 确保新目录结构
    ensureDir(config.new.faceDir);
    ensureDir(config.new.imagesDir);
    
    // 初始化userface.json文件
    await initUserFaceFile();
    
    // 执行迁移
    await migrateOldFiles();
  } catch (error) {
    logger.error('San-plugin:文件系统初始化失败:', error);
  }
};

// 检查依赖
const checkDependencies = async () => {
  try {
    const packagejson = await tool.readFromJsonFile('./plugins/San-plugin/package.json');
    const dependencyList = Object.keys(packagejson.dependencies);
    
    for (const dep of dependencyList) {
      try {
        await import(dep);
      } catch (error) {
        logger.error('-------San插件依赖缺失-----------');
        logger.error(`请运行: pnpm install --filter=san-plugin`);
        await common.relpyPrivate(tool.masterQQ(), 
          'San-plugin依赖缺失,请运行:\npnpm install --filter=san-plugin');
        throw error;
      }
    }
  } catch (error) {
    logger.error('San-plugin:依赖检查失败:', error);
    throw error;
  }
};

// 设置配置文件
const setConfig = async (dfConfigDir, configDir) => {
  try {
    const dfFiles = new Set((await fs.readdir(dfConfigDir)).filter(f => f.endsWith('.yaml')));
    const cfgFiles = new Set((await fs.readdir(configDir)).filter(f => f.endsWith('.yaml')));
    const toCopy = [...dfFiles].filter(f => !cfgFiles.has(f));

    // 复制缺失的配置文件
    for (const file of toCopy) {
      const src = path.join(dfConfigDir, file);
      const dest = path.join(configDir, file);
      await fs.copyFile(src, dest);
      logger.info('San-plugin:已复制配置文件:', file);
    }

    // 更新现有配置
    for (const file of cfgFiles) {
      const defaultCfg = await tool.readyaml(path.join(dfConfigDir, file));
      const currentCfg = await tool.readyaml(path.join(configDir, file));
      
      // 合并配置（默认配置为模板）
      const merged = { ...defaultCfg, ...currentCfg };
      await tool.objectToYamlFile(merged, path.join(configDir, file));
    }
  } catch (error) {
    logger.error('San-plugin:配置文件处理失败:', error);
  }
};

// 主初始化流程
const initialize = async () => {
  try {
    // 1. 初始化文件系统
    await initFileSystem();
    
    // 2. 检查依赖
    await checkDependencies();
    
    // 3. 设置配置文件
    await setConfig('./plugins/San-plugin/config/default_config', './plugins/San-plugin/config');
    await setConfig('./plugins/San-plugin/resources/AI/config/default_config', './plugins/San-plugin/resources/AI/config');
    
    // 4. 加载插件
    const pluginFiles = fsS.readdirSync('./plugins/San-plugin/apps')
      .filter(f => f.endsWith('.js'));
    
    const plugins = {};
    for (const file of pluginFiles) {
      try {
        const module = await import(`./apps/${file}`);
        const name = file.replace('.js', '');
        plugins[name] = module[Object.keys(module)[0]];
      } catch (error) {
        logger.error('San-plugin:加载插件', file, '失败:', error);
      }
    }
    
    return plugins;
  } catch (error) {
    logger.error('San-plugin初始化失败:', error);
    return {};
  }
};

// 执行初始化并导出
const apps = await initialize();
export { apps };