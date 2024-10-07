import * as face from './add-face.js';
export class San_ReplyFace1 extends plugin {
    constructor() {
        super({
            name: 'San表情随机回复-number',
            dsc: 'San表情随机回复-number',
            event: 'message', //发出提示信息
            priority: '-100', //优先级
            rule: [
                {
                    reg: '^\d+$',
                    fnc: 'getText',
                    log: false,
                },
            ]
        })
    }
    async getText(e) {
        face.facereply(e)
    }


}