
export function fit_text(text: string | HTMLElement, element: HTMLElement, font_size = 32) {
    if (!element.parentNode || !element.offsetWidth || !element.offsetHeight) {
        setTimeout(() => fit_text(text, element, font_size));
        return element;
    }

    const span = document.createElement('span');
    span.classList.add('text');
    element.append(span);
    span.append(text);

    const original_fs = font_size;

    span.style.fontSize = `${font_size}px`;
    while (span.scrollWidth + 4 > element.offsetWidth ||
        span.scrollHeight + 4 > element.offsetHeight
    ) {
        if (font_size > 7) {
            span.style.fontSize = `${--font_size}px`;
        } else if (span.style.wordBreak !== 'break-all') {
            span.style.wordBreak = 'break-all';
            span.style.fontSize = `${font_size = original_fs}px`;
        } else {
            span.innerText = span.innerText.slice(0, -4) + '...';
        }
    }

    return element;
}
