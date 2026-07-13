function createShiftArr(step: string | number): string[] {
  let space = '    ';

  if (isNaN(parseInt(step as string))) {
    space = step as string;
  } else {
    switch (step) {
      case 1: space = ' '; break;
      case 2: space = '  '; break;
      case 3: space = '   '; break;
      case 4: space = '    '; break;
      case 5: space = '     '; break;
      case 6: space = '      '; break;
      case 7: space = '       '; break;
      case 8: space = '        '; break;
      case 9: space = '         '; break;
      case 10: space = '          '; break;
      case 11: space = '           '; break;
      case 12: space = '            '; break;
    }
  }

  const shift: string[] = ['\n'];
  for (let ix = 0; ix < 100; ix++) {
    shift.push(shift[ix] + space);
  }
  return shift;
}

function createVkBeautify() {
  const step = '    ';
  const shift = createShiftArr(step);

  return {
    xml(text: string, step?: string | number): string {
      const ar = text.replace(/>\s{0,}</g, '><').replace(/</g, '~::~<').split('~::~');
      const len = ar.length;
      let inComment = false;
      let deep = 0;
      let str = '';
      const shiftArr = step ? createShiftArr(step) : shift;

      for (let ix = 0; ix < len; ix++) {
        if (ar[ix].search(/<!/) > -1) {
          str += shiftArr[deep] + ar[ix];
          inComment = true;
          if (ar[ix].search(/-->/) > -1 || ar[ix].search(/\]>/) > -1 || ar[ix].search(/!DOCTYPE/) > -1) {
            inComment = false;
          }
        } else if (ar[ix].search(/-->/) > -1 || ar[ix].search(/\]>/) > -1) {
          str += ar[ix];
          inComment = false;
        } else if (
          /^<\w/.exec(ar[ix - 1]) && /^<\/\w/.exec(ar[ix]) &&
          /^<[\w:\-\.\,]+/.exec(ar[ix - 1])?.[0] === /^<\/[\w:\-\.\,]+/.exec(ar[ix])?.[0].replace('/', '')
        ) {
          str += ar[ix];
          if (!inComment) deep--;
        } else if (ar[ix].search(/<\w/) > -1 && ar[ix].search(/<\//) === -1 && ar[ix].search(/\/>/) === -1) {
          str = !inComment ? str += shiftArr[deep++] + ar[ix] : str += ar[ix];
        } else if (ar[ix].search(/<\w/) > -1 && ar[ix].search(/<\//) > -1) {
          str = !inComment ? str += shiftArr[deep] + ar[ix] : str += ar[ix];
        } else if (ar[ix].search(/<\//) > -1) {
          str = !inComment ? str += shiftArr[--deep] + ar[ix] : str += ar[ix];
        } else if (ar[ix].search(/\/>/) > -1) {
          str = !inComment ? str += shiftArr[deep] + ar[ix] : str += ar[ix];
        } else if (ar[ix].search(/<\?/) > -1) {
          str += shiftArr[deep] + ar[ix];
        } else {
          str += ar[ix];
        }
      }

      return str[0] === '\n' ? str.slice(1) : str;
    },

    json(text: string, step?: string | number): string {
      const ar = this.jsonmin(text)
        .replace(/\{/g, '~::~{~::~')
        .replace(/\[/g, '[~::~')
        .replace(/\}/g, '~::~}')
        .replace(/\]/g, '~::~]')
        .replace(/\"\,/g, '",~::~')
        .replace(/\,\"/g, ',~::~"')
        .replace(/\]\,/g, '],~::~')
        .replace(/~::~\s{0,}~::~/g, '~::~')
        .split('~::~');

      const len = ar.length;
      let deep = 0;
      let str = '';
      const shiftArr = step ? createShiftArr(step) : shift;

      for (let ix = 0; ix < len; ix++) {
        if (/\{/.exec(ar[ix])) {
          str += shiftArr[deep++] + ar[ix];
        } else if (/\[/.exec(ar[ix])) {
          str += shiftArr[deep++] + ar[ix];
        } else if (/\]/.exec(ar[ix])) {
          str += shiftArr[--deep] + ar[ix];
        } else if (/\}/.exec(ar[ix])) {
          str += shiftArr[--deep] + ar[ix];
        } else {
          str += shiftArr[deep] + ar[ix];
        }
      }
      return str.replace(/^\n{1,}/, '');
    },

    css(text: string, step?: string | number): string {
      const ar = text.replace(/\s{1,}/g, ' ')
        .replace(/\{/g, '{~::~')
        .replace(/\}/g, '~::~}~::~')
        .replace(/\;/g, ';~::~')
        .replace(/\/\*/g, '~::~/*')
        .replace(/\*\//g, '*/~::~')
        .replace(/~::~\s{0,}~::~/g, '~::~')
        .split('~::~');
      const len = ar.length;
      let deep = 0;
      let str = '';
      const shiftArr = step ? createShiftArr(step) : shift;

      for (let ix = 0; ix < len; ix++) {
        if (/\{/.exec(ar[ix])) {
          str += shiftArr[deep++] + ar[ix];
        } else if (/\}/.exec(ar[ix])) {
          str += shiftArr[--deep] + ar[ix];
        } else if (/\*\\/.exec(ar[ix])) {
          str += shiftArr[deep] + ar[ix];
        } else {
          str += shiftArr[deep] + ar[ix];
        }
      }
      return str.replace(/^\n{1,}/, '');
    },

    xmlmin(text: string, preserveComments?: boolean): string {
      const str = preserveComments
        ? text
        : text.replace(/\<![ \r\n\t]*(--([^\-]|[\r\n]|-[^\-])*--[ \r\n\t]*)\>/g, '');
      return str.replace(/>\s{0,}</g, '><');
    },

    jsonmin(text: string): string {
      return text
        .replace(/\s{0,}\{\s{0,}/g, '{')
        .replace(/\s{0,}\[$/g, '[')
        .replace(/\[\s{0,}/g, '[')
        .replace(/:\s{0,}\[/g, ':[')
        .replace(/\s{0,}\}\s{0,}/g, '}')
        .replace(/\s{0,}\]\s{0,}/g, ']')
        .replace(/\"\s{0,}\,/g, '",')
        .replace(/\,\s{0,}\"/g, ',"')
        .replace(/\"\s{0,}:/g, '":')
        .replace(/:\s{0,}\"/g, ':"')
        .replace(/:\s{0,}\[/g, ':[')
        .replace(/\,\s{0,}\[/g, ',[')
        .replace(/\,\s{2,}/g, ', ')
        .replace(/\]\s{0,},\s{0,}\[/g, '],[');
    },

    cssmin(text: string, preserveComments?: boolean): string {
      const str = preserveComments
        ? text
        : text.replace(/\/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*+\//g, '');
      return str
        .replace(/\s{1,}/g, ' ')
        .replace(/\{\s{1,}/g, '{')
        .replace(/\}\s{1,}/g, '}')
        .replace(/\;\s{1,}/g, ';')
        .replace(/\/\*\s{1,}/g, '/*')
        .replace(/\*\/\s{1,}/g, '*/');
    },
  };
}

const vkbeautify = createVkBeautify();
export default vkbeautify;
