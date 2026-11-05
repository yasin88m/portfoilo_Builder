import test from 'node:test';
import assert from 'node:assert/strict';
import {portfolioFiles,templates} from '../public/shared.js';
import {wordpressFiles} from '../public/wordpress.js';

test('all templates link to independent works, details and optional plans across exports', () => {
 for(const template of templates){
  const sample={name:'Studio',title:'Designer',field:'Design',template,projects:[
   {id:'work-a',title:'First project',client:'Client A',activities:'Research\nDesign',description:'Details',gallery:['data:image/png;base64,AA==']}
  ],plans:{enabled:true,items:[{name:'Pro',price:'۳ میلیون تومان',features:'مشاوره',featured:true}]},reviews:[{name:'Customer A',quote:'Great experience',rating:4}]};
  const html=Object.fromEntries(portfolioFiles(sample).map(file=>[file.path,file.content]));
  assert.match(html['index.html'],/href="\.\/projects\.html"/);
  assert.match(html['index.html'],/Great experience/);
  assert.match(html['index.html'],/review-grid portfolio-carousel/);
  assert.match(html['index.html'],/project-grid portfolio-carousel/);
  assert.match(html['projects.html'],/href="\.\/project-work-a\.html"/);
  assert.match(html['projects.html'],/project-grid portfolio-carousel/);
  assert.match(html['project-work-a.html'],/Client A/);
  assert.match(html['project-work-a.html'],/Research/);
  assert.match(html['project-work-a.html'],/detail-gallery portfolio-carousel/);
  assert.match(html['plans.html'],/۳ میلیون تومان/);
  assert.match(html['plans.html'],/plan-card featured/);
  const wp=wordpressFiles(sample).files;
  assert.ok(wp.some(file=>file.path.endsWith('/elementor/project-work-a.json')&&file.content.includes('Client A')));
  assert.ok(wp.some(file=>file.path.endsWith('/elementor/plans.json')));
  assert.ok(!portfolioFiles({...sample,plans:{enabled:false}}).some(file=>file.path==='plans.html'));
 }
});
