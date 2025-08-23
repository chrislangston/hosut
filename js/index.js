// index.js - logic specific to index.html
(async function(){
  const courseData = await fetch('pharmacy.json').then(r=>r.json()).catch(err=>{ console.error(err); return null; });
  const listEl = document.getElementById('lessons-list');
  if(!courseData){
    listEl.innerHTML = '<div class="alert alert-danger">Unable to load course data.</div>';
    return;
  }
  const frag = document.createDocumentFragment();
  courseData.lessons.sort((a,b)=>a.displayOrder - b.displayOrder); // maintain order as provided; no re-sorting rule? (we keep given order)
  courseData.lessons.forEach(lesson => {
    const totalClips = (lesson.clips||[]).length;
    const status = ProgressTracker.computeLessonStatus(String(lesson.lessonId), totalClips);
    const statusClass = status === 'Complete' ? 'text-success fw-semibold' : (status === 'In Progress' ? 'text-warning' : 'text-muted');
    const card = document.createElement('a');
    card.href = `lessondetail.html?lessonId=${encodeURIComponent(lesson.lessonId)}`;
    card.className = 'list-group-item list-group-item-action d-flex gap-3 py-3 align-items-start';
    card.setAttribute('data-lesson-id', lesson.lessonId);
    card.addEventListener('click', () => {
      ProgressTracker.markLessonVisited(String(lesson.lessonId));
    });
    card.innerHTML = `
      <img src="${lesson.thumbnailImageUrl}" alt="Thumbnail for ${lesson.lessonDescription}" class="flex-shrink-0 rounded" style="width:80px;height:60px;object-fit:cover;" loading="lazy">
      <div class="w-100 d-flex flex-column">
        <div class="d-flex w-100 justify-content-between">
          <h6 class="mb-1">${lesson.lessonDescription}</h6>
          <small class="text-nowrap text-body-secondary">${lesson.durationToDisplay}</small>
        </div>
        <div class="mb-1 small">${totalClips} clip${totalClips!==1?'s':''}</div>
        <div class="small ${statusClass}" data-status>${status}</div>
      </div>`;
    frag.appendChild(card);
  });
  listEl.appendChild(frag);

  // Test harness if ?test=1
  if(new URLSearchParams(location.search).get('test')==='1'){
    runIndexTests(courseData);
  }
})();

function runIndexTests(courseData){
  console.log('Running index tests');
  const results = [];
  try{
    const lessonId = String(courseData.lessons[0].lessonId);
    ProgressTracker.markLessonVisited(lessonId);
    let status = ProgressTracker.computeLessonStatus(lessonId, courseData.lessons[0].clips.length);
    results.push(['Visited status not started', status === 'Not Started']);
    const firstClip = courseData.lessons[0].clips[0];
    ProgressTracker.markClipStarted(lessonId, firstClip.clipId);
    status = ProgressTracker.computeLessonStatus(lessonId, courseData.lessons[0].clips.length);
    results.push(['After clip start -> In Progress', status === 'In Progress']);
  }catch(e){
    results.push(['Exception free run', false]);
  }
  const div = document.getElementById('test-results');
  if(div){
    div.innerHTML = '<h5>Index Tests</h5>' + results.map(r=>`<div>${r[0]}: ${r[1]?'PASS':'FAIL'}</div>`).join('');
  }
}
