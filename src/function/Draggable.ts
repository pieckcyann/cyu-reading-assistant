export function drag(obj: HTMLElement): void {
    // 当鼠标在被拖拽元素上按下，开始拖拽
    obj.onmousedown = function (event: MouseEvent) {
        // 设置obj捕获所有的鼠标按下事件，而不仅仅是在元素内部区域
        // obj.setCapture && obj.setCapture();
        // 解决兼容性问题,实现IE8的兼容
        event = event || window.event
        // 鼠标在元素中的偏移量等于 鼠标的clientX - 元素的offsetLeft
        const ol = event.clientX - obj.offsetLeft
        const ot = event.clientY - obj.offsetTop

        // 为document绑定一个onmousemove事件
        document.onmousemove = function (event: MouseEvent) {
            event = event || window.event
            const left = event.clientX - ol
            const top = event.clientY - ot
            obj.style.left = left + 'px'
            obj.style.top = top + 'px'
        }

        // 为document绑定一个鼠标松开事件onmouseup
        document.onmouseup = function () {
            // 当鼠标松开时，被拖拽元素固定在当前位置
            // 当鼠标松开时，取消onmousemove事件
            document.onmousemove = null
            // 当鼠标松开时，onmouseup事件，要不每次一松开鼠标都触发此事件
            document.onmouseup = null
            // 鼠标松开，取消事件的捕获
            // obj.releaseCapture && obj.releaseCapture();
        }

        return false
    }
}