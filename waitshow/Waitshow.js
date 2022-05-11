import CallFrame from "./CallFrame.js"

const cls = cls => document.getElementsByClassName(cls)
const tag = tag => document.getElementsByTagName(tag)

export const Waitshow = {
    check: () => CallFrame(() => {
        const height = window.innerHeight
        for (const el of cls('waitshow')) {
            const rect = el.getBoundingClientRect()
            const utop = rect.top; //расстояние от верхней границы браузера до верхней границы блока
            const ubot = rect.bottom; //расстояние от нижней границы браузера до нижней границы блока
            const dtop = utop - height
            const dbot = ubot - height
            if (ubot < -100) continue //!Низ el выше верхней границы
            if (dtop < 100) {   //!Верх el выше нижней границы
                el.classList.add('show')
            }
        }
    }, 400),
    init: () => {
        const link = document.createElement('link')
        link.rel = "stylesheet"
        link.href = "/-waitshow/style.css"
        document.head.append(link)

        window.addEventListener('scroll', Waitshow.check)
        for (let img of tag('img')) {
            let path = [], el = img
            while (el && el.parentElement) path.push(el = el.parentElement)
            let ar = path.filter(el => ~['HEADER','FOOTER'].indexOf(el.tagName))
            if (ar.length) continue //Для картинок в шапке подвале ничего не добавляем
            img.classList.add('waitshow')
        }
        Waitshow.check()
    }
}