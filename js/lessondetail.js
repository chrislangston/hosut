// lessondetail.js - logic for lesson detail page
(async function(){
  const params = new URLSearchParams(location.search);
  const lessonId = params.get('lessonId');
  const container = document.getElementById('lesson-detail');
  if(!lessonId){
    container.innerHTML = '<div class="alert alert-danger">No lessonId provided.</div>';
    return;
  }
  const courseData = await fetch('pharmacy.json').then(r=>r.json()).catch(err=>null);
  if(!courseData){
    container.innerHTML = '<div class="alert alert-danger">Unable to load course data.</div>';
    return;
  }
  const lesson = courseData.lessons.find(l=>String(l.lessonId) === String(lessonId));
  if(!lesson){
    container.innerHTML = '<div class="alert alert-warning">Lesson not found. <a href="index.html">Return to Course</a></div>';
    return;
  }

  ProgressTracker.markLessonVisited(String(lesson.lessonId));

  const headerHtml = `
    <h2 class="h4 mb-1">Lesson Detail for ${lesson.lessonDescription}</h2>
    <div class="text-body-secondary mb-3">Lesson Duration of ${lesson.durationToDisplay}</div>
  `;

  const clipsSorted = [...(lesson.clips||[])].sort((a,b)=>a.displayOrder - b.displayOrder);

  const clipsList = document.createElement('div');
  clipsList.className = 'list-group mb-3';
  clipsSorted.forEach((clip, idx) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'list-group-item list-group-item-action d-flex gap-3 align-items-start';
    item.setAttribute('data-clip-id', clip.clipId || (lesson.lessonId + '_' + (idx+1)));
    item.innerHTML = `
      <div class="icon-col pt-1"><i class="bi bi-play-btn-fill" aria-hidden="true"></i></div>
      <div class="flex-grow-1">
        <div class="fw-semibold">${clip.title}</div>
        <div class="small text-body-secondary">${clip.durationDisplay}</div>
      </div>
      <div class="status-icon" aria-label="status"></div>`;
    item.addEventListener('click', ()=>{
      playClipAt(idx);
    });
    clipsList.appendChild(item);
  });

  container.innerHTML = headerHtml + `
    <div class="row">
      <div class="col-12 col-lg-8 mb-3">
        <video id="lesson-player" class="video-js vjs-fluid rounded border" controls preload="none" data-setup='{}'>
          <source src="" type="video/mp4" />
        </video>
      </div>
      <div class="col-12 col-lg-4">
        <h5 class="h6">Clips</h5>
      </div>
    </div>`;
  const rightCol = container.querySelector('.col-lg-4');
  rightCol.appendChild(clipsList);
  const backBtn = document.createElement('a');
  backBtn.href = 'index.html';
  backBtn.className = 'btn btn-outline-primary';
  backBtn.textContent = 'Return to Course';
  rightCol.appendChild(backBtn);
  rightCol.appendChild(document.createElement('hr'));
  const statusDiv = document.createElement('div');
  statusDiv.id = 'lesson-status';
  statusDiv.className = 'small';
  rightCol.appendChild(statusDiv);

  const playerEl = document.getElementById('lesson-player');
  let player = null;
  if(window.videojs){
    player = window.videojs(playerEl);
  }

  let currentIndex = null;

  function updateClipStatusUI(){
    const totalClips = clipsSorted.length;
    clipsList.querySelectorAll('[data-clip-id]').forEach((btn, idx) => {
      const clipId = btn.getAttribute('data-clip-id');
      const p = ProgressTracker.loadProgress();
      const lessonProg = p.lessons[String(lesson.lessonId)];
      const clipProg = lessonProg && lessonProg.clips[clipId];
      const statusIcon = btn.querySelector('.status-icon');
      statusIcon.innerHTML = '';
      if(clipProg && clipProg.completed){
        statusIcon.innerHTML = '<i class="bi bi-check-circle-fill text-success"></i>';
      } else if(clipProg && clipProg.started){
        statusIcon.innerHTML = '<i class="bi bi-play-circle text-warning"></i>';
      }
      btn.classList.toggle('active', idx===currentIndex);
    });
    const overall = ProgressTracker.computeLessonStatus(String(lesson.lessonId), totalClips);
    statusDiv.textContent = 'Lesson Status: ' + overall;
    if(overall === 'Complete') statusDiv.classList.add('text-success');
  }

  function playClipAt(index){
    currentIndex = index;
    const clip = clipsSorted[index];
    const clipId = clip.clipId || (lesson.lessonId + '_' + (index+1));
    if(player){
      player.pause();
      player.src({ type:'video/mp4', src: clip.url });
      player.ready(()=>{ player.play(); });
    } else {
      playerEl.querySelector('source').src = clip.url;
      playerEl.load();
      playerEl.play();
    }
    ProgressTracker.markClipStarted(String(lesson.lessonId), clipId);
    // If this is the last clip and user started it, mark lesson complete per spec variant
    if(index === clipsSorted.length -1){
      ProgressTracker.markLessonComplete(String(lesson.lessonId));
    }
    updateClipStatusUI();
  }

  function handleEnded(){
    if(currentIndex == null) return;
    const clip = clipsSorted[currentIndex];
    const clipId = clip.clipId || (lesson.lessonId + '_' + (currentIndex+1));
    ProgressTracker.markClipCompleted(String(lesson.lessonId), clipId, clipsSorted.length);
    if(currentIndex < clipsSorted.length -1){
      playClipAt(currentIndex + 1);
    } else {
      updateClipStatusUI();
    }
  }

  if(player){
    player.on('ended', handleEnded);
  } else {
    playerEl.addEventListener('ended', handleEnded);
  }

  updateClipStatusUI();

  // Tests if ?test=1
  if(params.get('test')==='1'){
    runDetailTests(lesson, clipsSorted);
  }
})();

function runDetailTests(lesson, clips){
  const results = [];
  try{
    const first = clips[0];
    ProgressTracker.markClipStarted(String(lesson.lessonId), first.clipId);
    ProgressTracker.markClipCompleted(String(lesson.lessonId), first.clipId, clips.length);
    const status = ProgressTracker.computeLessonStatus(String(lesson.lessonId), clips.length);
    results.push(['After completing one clip (not all)', status === 'In Progress' || status==='Complete' && clips.length===1]);
  }catch(e){ results.push(['No exceptions', false]); }
  const div = document.getElementById('test-results');
  if(div){
    div.innerHTML = '<h5>Detail Tests</h5>' + results.map(r=>`<div>${r[0]}: ${r[1]?'PASS':'FAIL'}</div>`).join('');
  }
}
