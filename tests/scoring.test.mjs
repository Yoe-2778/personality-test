import test from 'node:test';
import assert from 'node:assert/strict';
import { questions, dimensions, archetypes, guidance, calculateResult } from '../data.js';

test('24题均匀覆盖四个维度，选项和方向合法', () => {
  assert.equal(questions.length, 24);
  for (let dimension = 0; dimension < 4; dimension++) {
    const subset = questions.filter(q => q.dimension === dimension);
    assert.equal(subset.length, 6);
    assert.equal(subset.filter(q => q.direction === 1).length, 3);
    assert.equal(subset.filter(q => q.direction === -1).length, 3);
  }
  for (const q of questions) { assert.equal(q.options.length, 4); assert.ok(q.title); }
});

test('所有16种结果都可达，反向题方向正确', () => {
  const names = new Set();
  for (let type = 0; type < 16; type++) {
    const sides = [3, 2, 1, 0].map(shift => type >> shift & 1);
    const answers = questions.map(q => {
      const target = sides[q.dimension];
      return q.direction === 1 ? target * 3 : (1 - target) * 3;
    });
    const r = calculateResult(answers);
    assert.equal(r.type, type);
    assert.deepEqual(r.sides, sides);
    assert.deepEqual(r.scores, sides.map(s => s * 100));
    assert.ok(r.balanced.every(b => !b));
    names.add(r.name);
    sides.forEach((s, i) => assert.ok(guidance[i][s].request));
  }
  assert.equal(names.size, 16); assert.equal(archetypes.length, 16); assert.equal(dimensions.length, 4);
});

test('平衡回答显示中间坐标和双偏好标记', () => {
  const r = calculateResult(Array(24).fill(0));
  assert.deepEqual(r.scores, [50, 50, 50, 50]);
  assert.ok(r.balanced.every(Boolean));
});

test('拒绝未完成、越界、非整数以及空洞数组', () => {
  for (const answers of [null, [], Array(24), Array(23).fill(0), Array(24).fill(null), Array(24).fill(4), Array(24).fill(-1), Array(24).fill(1.5)]) {
    assert.throws(() => calculateResult(answers));
  }
});
