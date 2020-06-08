import qs from 'querystring';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import url from 'url';
import http from 'http';
import XLSX from 'xlsx';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const arr = [
  {
    name: '蓓蕾幼儿园',
    inputNames: ['蓓蕾幼儿园'],
    outputPages: 4,   // 摇珠页数
    outputTotal: 113, // 摇珠人数
    inputPages: 13,   // 名单页数
    inputTotal: 406,  // 名单人数 406
    statTotal: 409,   // 统计人数 409
    statCount: 113,   // 统计学位数 111
  },
  {
    name: '禅城区中心幼儿园',
    inputNames: ['禅城区中心幼儿园'],
    outputPages: 4,
    outputTotal: 109,
    inputPages: 6,
    inputTotal: 178,
    statTotal: 180,
    statCount: 111,
  },
  {
    name: '诚信幼儿园',
    inputNames: ['诚信幼儿园'],
    outputPages: 6,
    outputTotal: 178,
    inputPages: 8,
    inputTotal: 253,
    statTotal: 256,
    statCount: 179,
  },
  {
    name: '佛山市幼儿园',
    inputNames: ['佛山市幼儿园'],
    outputPages: 4,
    outputTotal: 116,
    inputPages: 13,
    inputTotal: 400,
    statTotal: 405,
    statCount: 116,
  },
  {
    name: '惠景幼儿园',
    inputNames: ['惠景幼儿园_1', '惠景幼儿园_2'],
    outputPages: 1,
    outputTotal: 20,
    inputPages: 28,
    inputTotal: 894,
    statTotal: 907,
    statCount: 20,
  },
  {
    name: '机关第二幼儿园',
    inputNames: ['机关第二幼儿园'],
    outputPages: 6,
    outputTotal: 202,
    inputPages: 11,
    inputTotal: 327,
    statTotal: 333,
    statCount: 206,
  },
  {
    name: '机关第一幼儿园',
    inputNames: ['机关第一幼儿园'],
    outputPages: 4,
    outputTotal: 134,
    inputPages: 19,
    inputTotal: 601,
    statTotal: 610,
    statCount: 138,
  },
  {
    name: '教工第二幼儿园',
    inputNames: ['教工第二幼儿园'],
    outputPages: 3,
    outputTotal: 88,
    inputPages: 5,
    inputTotal: 145,
    statTotal: 147,
    statCount: 90,
  },
  {
    name: '明珠幼儿园',
    inputNames: ['明珠幼儿园_1', '明珠幼儿园_2'],
    outputPages: 3,
    outputTotal: 84,
    inputPages: 24,
    inputTotal: 748,
    statTotal: 759,
    statCount: 84,
  },
  {
    name: '南庄镇中心幼儿园',
    inputNames: ['南庄镇中心幼儿园'],
    outputPages: 1,
    outputTotal: 32,
    inputPages: 11,
    inputTotal: 345,
    statTotal: 347,
    statCount: 32,
  },
  {
    name: '石湾第一幼儿园',
    inputNames: ['石湾第一幼儿园'],
    outputPages: 5,
    outputTotal: 170,
    inputPages: 16,
    inputTotal: 510,
    statTotal: 516,
    statCount: 174,
  },
  {
    name: '同济幼儿园',
    inputNames: ['同济幼儿园_1', '同济幼儿园_2'],
    outputPages: 4,
    outputTotal: 111,
    inputPages: 22,
    inputTotal: 692,
    statTotal: 702,
    statCount: 113,
  },
  {
    name: '张槎中心幼儿园',
    inputNames: ['张槎中心幼儿园_1', '张槎中心幼儿园_2'],
    outputPages: 5,
    outputTotal: 145,
    inputPages: 21,
    inputTotal: 643,
    statTotal: 650,
    statCount: 147,
  },
];

// 分析数据
// 从 n 个人中抽取 m 个人，概率为 p
// 摇号号码格式，如 B0648703，前三位固定不变，所以主要讨论 v = ID[3..7]
// len = Math.floor(log2(v)/log2(m)) + 1, m 进制下的位数
// c(j) = (v / (m ^ j)) % m, m 进制下 j 位上的值; ci(j), 输入数据的 j 位出现值; co(j), 输入数据的 j 位出现值
// s{i}(j) = COUNT(c(j) === i), c(j) 与 i 相等的次数；si{i}(j), 输入数据的 c(j) 与 i 相等的次数; so{i}(j), 输入数据的 c(j) 与 i 相等的次数
// r{i}(j) = so{i}(j) / si{i}(j);
// r1 名义概率, r2 实际概率
// d{i}(j) = (r{i}(j) - r2) / r2;
// e(j) 期望, ei(j) 输入数据期望, eo(j) 输出数据期望
// v(j) 期望, vi(j) 输入数据方差, vo(j) 输出数据方差
const convert = (inputs, outputs, m, max, { in1, out1, in2, out2 }) => {
  if (m <= 1 || m > 16) return {};

  const indexes = new Array(m).fill(0).map((n, i) => i);
  const data = new Array((m + 1) * 4);
  const r1 = out1 / in1;  // 名义概率
  const r2 = out2 / in2;  // 实际概率
  const len = Math.floor(Math.log(max) / Math.log(m)) + 1;  // m进制下的位数
  const es = new Array(len).fill(0);  // 期望
  const vs = new Array(len).fill(0);  // 方差
  let d = 0; // 偏离度

  for (let index of indexes) {
    const sos = new Array(len).fill(0);
    const sis = new Array(len).fill(0);
    const rs = new Array(len).fill(0);
    const ds = new Array(len).fill(0);
    for (let input of inputs) {
      let v = parseInt(input.id.substr(3));   // ID[3..7]
      let c = 0;
      for (let j = 0; j < len && v; j++) {
        c = v % m;
        if (c == index) {
          if (!sis[j]) sis[j] = 0;
          sis[j]++;
          if (outputs.find(n => n.id === input.id)) {
            if (!sos[j]) sos[j] = 0;
            sos[j]++;
          }
        }
        v = Math.floor(v/ m);
      }
    }
    for (let j = 0; j < len; j++) {
      rs[j] = sis[j] !== 0 ? sos[j] / sis[j] : '';
      ds[j] = rs[j] !== '' ? (rs[j] - r2) / r2 : '';
      es[j] = es[j] + sis[j] * index / in2;
      d = d + Math.pow(ds[j], 2);
    }
    for (let j = 0; j < len; j++) {
      vs[j] = vs[j] + sis[j] * Math.pow(index - es[j], 2) / in2;
    }
    //
    const osis = sis.reverse();
    osis.unshift(index);
    data[index] = { ...osis };

    const osos = sos.reverse();
    osos.unshift(index);
    data[index + m + 1] = { ...osos };

    const ors = rs.reverse();
    ors.unshift(index);
    data[index + 2 * (m + 1)] = { ...ors };

    const ods = ds.reverse();
    ods.unshift(index);
    data[index + 3 * (m + 1)] = { ...ods };
  }

  data.push({ 0: '期望' });
  const oes = es.reverse();
  oes.unshift(0);
  data.push({ ...oes });
  data.push({ 0: '方差' });
  const ovs = vs.reverse();
  ovs.unshift(0);
  data.push({ ...ovs });
  data.push({ 0: '偏离度' });
  data.push({ 0: Math.sqrt(d / (m * len)) });
  data.push({ 0: '名义摇号人数' });
  data.push({ 0: in1 });
  data.push({ 0: '名义中签人数' });
  data.push({ 0: out1 });
  data.push({ 0: '名义概率' });
  data.push({ 0: r1 });
  data.push({ 0: '实际摇号人数' });
  data.push({ 0: in2 });
  data.push({ 0: '实际中签人数' });
  data.push({ 0: out2 });
  data.push({ 0: '实际概率' });
  data.push({ 0: r2 });
  return data;
};

const compute = () => {
  const wb = XLSX.utils.book_new();
  for (let item of arr) {
    const inputs = JSON.parse(fs.readFileSync(path.join(__dirname, './images/inputJson', `${item.name}.json`)));
    const outputs = JSON.parse(fs.readFileSync(path.join(__dirname, './images/outputJson', `${item.name}.json`)));
    const wsData = convert(inputs, outputs, 10, 70000,
      { 
        in1: item.statTotal, 
        out1: item.statCount,
        in2: item.inputTotal,
        out2: item.outputTotal,
      },
    );
    const ws = XLSX.utils.json_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, item.name);
  }
  XLSX.writeFile(wb, path.join(__dirname, './images', 'demo2.xlsx'));
};

compute();

/**
 * 模拟抽签
 */
const random = (item, size) => {
  const { name, inputTotal, outputTotal, statCount, statTotal } = item;
  const inputs = JSON.parse(fs.readFileSync(path.join(__dirname, './images/inputJson', `${name}.json`)));
  const wb = XLSX.utils.book_new();
  let pool = Array.copyWithin(inputs);

  for (let i = 0; i < size; i++) {
    const outputs = [];
    for (let j = 0; j < outputTotal; j++) {
      const index = Math.floor(Math.random() * inputs.length);
      outputs.push(pool[index]);
      outputs.splice(index, 1);
    }
    const wsData = convert(inputs, outputs, 2, 70000,
      { 
        in1: statTotal, 
        out1: statCount,
        in2: inputTotal,
        out2: outputTotal,
      },
    );
    const ws = XLSX.utils.json_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, `${name}_${i}`);
  }

  XLSX.writeFile(wb, path.join(__dirname, './images/randomXls', `${name}.xlsx`));
};

// random(arr[12], 100000);

const test = (item) => {
  const inputs = JSON.parse(fs.readFileSync(path.join(__dirname, './images/outputJson', `${item.name}.json`)));
  return inputs.filter(n => n.id[7] == 4);
};

// console.log(test(arr[12]).length);