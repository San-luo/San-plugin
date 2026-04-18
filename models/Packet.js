import pb from './protobuf/index.js';
import { Buffer } from 'buffer';

export const Proto = pb;

export const replacer = (key, value) => {
  if (typeof value === 'bigint') {
    return Number(value) >= Number.MAX_SAFE_INTEGER ? value.toString() : Number(value);
  } else if (Buffer.isBuffer(value)) {
    return `hex->${value.toString('hex')}`;
  } else if (value?.type === 'Buffer' && Array.isArray(value.data)) {
    return `hex->${Buffer.from(value.data).toString('hex')}`;
  } else {
    return value;
  }
};

export const encode = (json) => {
  return pb.encode(processJSON(json));
};

/**
 * 发送数据包的通用方法
 * @param {*} e - QQ号或Bot实例
 * @param {string} cmd - 要执行的命令
 * @param {string|Object} content - 要发送的内容，可以是对象或JSON字符串
 * @param {boolean} [isJce=false] - 是否为JCE协议数据
 * @param {boolean} [isQQ=false] - 是否为QQ号
 * @returns {Promise<Object>} 返回解码后的响应数据
 */
export const Send = async (e, cmd, content, isJce = false, isQQ = false) => {
  try {
    const bot = isQQ ? Bot[e] : e.bot;

    if (!isJce) {
      const data = encode(typeof content === 'object' ? content : JSON.parse(content));
      let ret;
      if (bot?.adapter?.name === 'OneBotv11') {
        let action = bot?.version?.app_name === 'Lagrange.OneBot' ? '.send_packet' : 'send_packet';
        ret = Buffer.from(data).toString('hex');
        if (bot?.version?.app_name === 'LLOneBot') {
          const resp = await bot.sendApi('send_pb', {
            cmd: cmd,
            hex: ret,
          });
          return pb.decode(resp.hex) || {};
        }
        const req = await bot.sendApi(action, {
          cmd: cmd,
          command: cmd,
          data: ret,
        });
        let rsp = pb.decode(req.data.result || req.data);
        if (rsp[1] !== 0 && cmd === 'MessageSvc.PbSendMsg') {
          throw new Error(`[${bot.uin}] 消息发送失败，请检查您的消息是否正确！\n ${JSON.stringify(rsp, null, 2)}`);
        }
        return rsp;
      } else if (bot?.adapter?.name === 'tanebi') {
        const payload = await bot.sendUni(cmd, Buffer.from(data), false, null, true);
        let rsp = pb.decode(payload);
        if (rsp[1] !== 0 && cmd === 'MessageSvc.PbSendMsg') {
          throw new Error(`[${bot.uin}] 消息发送失败，请检查您的消息是否正确！\n ${JSON.stringify(rsp, null, 2)}`);
        }
        return rsp;
      } else if (bot?.adapter?.name === 'Secluded') {
        const payload = await bot.sendUni(cmd, Buffer.from(data), false, true);
        let rsp = pb.decode(payload);
        if (rsp[1] !== 0 && cmd === 'MessageSvc.PbSendMsg') {
          throw new Error(`[${bot.uin}] 消息发送失败，请检查您的消息是否正确！\n ${JSON.stringify(rsp, null, 2)}`);
        }
        return rsp;
      } else {
        ret = Buffer.from(data);
        const payload = await bot.sendUni(cmd, ret);
        let rsp = pb.decode(payload);
        if (rsp[1] !== 0 && cmd === 'MessageSvc.PbSendMsg') {
          throw new Error(`[${bot.uin}] 消息发送失败，请检查您的消息是否正确！\n ${JSON.stringify(rsp, null, 2)}`);
        }
        return rsp;
      }
    } else {
      // JCE 协议支持（San-plugin 暂不需要，保留接口）
      throw new Error('JCE protocol not implemented in San-plugin Packet');
    }
  } catch (error) {
    logger.error(`发包失败：${error}`);
    throw error;
  }
};

/**
 * 发送 OidbSvcTrpcTcp 协议请求
 * @param {Object} e - 事件对象
 * @param {string|Array} cmd - 命令名称或命令数组
 * @param {Object} body - 请求体
 * @param {boolean} [isQQ=false] - 是否为QQ号
 * @returns {Promise<Object>} 返回响应数据的第4字段
 */
export const sendOidbSvcTrpcTcp = async (e, cmd, body, isQQ = false) => {
  try {
    const bot = isQQ ? Bot[e] : e.bot;
    let type1, type2;
    if (Array.isArray(cmd) && cmd.length > 2) {
      ((type1 = cmd[1]), (type2 = cmd[2]));
      cmd = String(cmd[0]);
    } else {
      cmd = Array.isArray(cmd) ? String(cmd[0]) : cmd;
      const sp = cmd.replace('OidbSvcTrpcTcp.', '').split('_');
      ((type1 = parseInt(sp[0], 16)), (type2 = parseInt(sp[1])));
    }
    const _body = {
      1: type1,
      2: type2,
      4: body,
      ...(bot?.adapter?.name === 'OneBotv11'
        ? {
            12: 1,
          }
        : {
            6: 'android ' + (bot?.apk?.ver || '9.0.90'),
          }),
    };
    const rsp = await Send(e, cmd, _body, false, isQQ);
    return rsp[4];
  } catch (error) {
    logger.error(`sendMessage failed: ${error.message}`);
  }
};

// 仅用于方便用户手动输入pb时使用，一般不需要使用
export const processJSON = (json) => _processJSON(typeof json === 'string' ? JSON.parse(json) : json);

function _processJSON(json, path = []) {
  const result = {};
  if (Buffer.isBuffer(json) || json instanceof Uint8Array) {
    return json;
  } else if (Array.isArray(json)) {
    return json.map((item, index) => processJSON(item, path.concat(index + 1)));
  } else if (typeof json === 'object' && json !== null) {
    for (const key in json) {
      const numKey = Number(key);
      if (Number.isNaN(numKey)) {
        throw new Error(`Key is not a valid integer: ${key}`);
      }
      const currentPath = path.concat(key);
      const value = json[key];

      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          result[numKey] = value.map((item, idx) => processJSON(item, currentPath.concat(String(idx + 1))));
        } else {
          result[numKey] = processJSON(value, currentPath);
        }
      } else {
        if (typeof value === 'string') {
          if (value.startsWith('hex->')) {
            const hexStr = value.slice('hex->'.length);
            if (isHexString(hexStr)) {
              result[numKey] = Buffer.from(hexStr, 'hex');
            } else {
              result[numKey] = value;
            }
          } else if (currentPath.slice(-2).join(',') === '5,2' && isHexString(value)) {
            result[numKey] = Buffer.from(value, 'hex');
          } else {
            result[numKey] = value;
          }
        } else {
          result[numKey] = value;
        }
      }
    }
  } else {
    return json;
  }
  return result;
}

function isHexString(s) {
  return s.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(s);
}
