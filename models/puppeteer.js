import puppeteer from 'puppeteer';

let browserInstance = null;

async function getBrowserInstance() {
    if (!browserInstance) {
        try {
            const startTime = performance.now(); // 记录启动开始时间
            logger.info("San-plugin: 浏览器启动中....");
            browserInstance = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
            const endTime = performance.now(); // 记录启动完成时间
            const timeTaken = (endTime - startTime).toFixed(2); // 计算启动所用时间，并保留两位小数
            logger.info(`San-plugin: 浏览器启动成功，耗时 ${timeTaken} ms`);
        } catch (error) {
            logger.error('San-plugin: 启动浏览器时遇到错误:', error);
            throw error;
        }
    } else {
        logger.info("San-plugin: 使用已有的浏览器实例");
    }
    return browserInstance;
}

async function closeBrowserInstance() {
    if (browserInstance) {
        try {
            logger.info('San-plugin: 正在关闭浏览器...');
            await browserInstance.close();
            logger.info('San-plugin: 浏览器已关闭');
        } catch (error) {
            logger.error('San-plugin: 关闭浏览器时遇到错误:', error);
        } finally {
            browserInstance = null;
        }
    } else {
        logger.info('San-plugin: 没有活跃的浏览器实例需要关闭');
    }
}

// 监听进程退出信号，确保在进程结束前关闭浏览器实例
function setupExitHandler() {
    const exitHandlers = async () => {
        logger.info('San-plugin: 收到退出信号，开始清理工作...');
        if (browserInstance) {
            await closeBrowserInstance();
        }
        logger.info('San-plugin: 清理完成，退出进程');
        process.exit();
    };

    // 添加信号监听器
    ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGQUIT'].forEach(signal => {
        process.on(signal, exitHandlers);
    });
}

// 在模块加载时设置退出处理器
setupExitHandler();

export { getBrowserInstance, closeBrowserInstance };