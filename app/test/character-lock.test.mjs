import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
test('原版人物库固定身份和素材指纹，不能悄悄替换人物',async()=>{
 const library=JSON.parse(await readFile(new URL('../pose-library.json',import.meta.url),'utf8'));
 const source=await readFile(new URL('../dist/artwork.js',import.meta.url),'utf8');const images=vm.runInNewContext(source+'\nORIGINAL_ARTWORK;');
 assert.equal(library.character.id,'original-girl-v1');assert.equal(library.entries.length,images.length);
 for(const entry of library.entries){assert.equal(entry.characterId,library.character.id);assert.equal(createHash('sha256').update(Buffer.from(images[entry.assetIndex].split(',')[1],'base64')).digest('hex'),entry.assetSha256);}
});
