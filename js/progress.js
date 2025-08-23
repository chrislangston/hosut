// progress.js - handles cookie-based progress tracking for lessons and clips
(function(global){
  const COOKIE_NAME = 'hosut_progress';
  const COOKIE_DAYS = 365;
  const MAX_SINGLE_COOKIE_LENGTH = 3500; // soft limit to pivot strategy

  function readCookie(){
    const match = document.cookie.match(new RegExp('(?:^|; )' + COOKIE_NAME + '=([^;]*)'));
    if(!match) return { lessons: {} };
    try { return JSON.parse(decodeURIComponent(match[1])); } catch(e){ return { lessons: {} }; }
  }

  function writeCookie(data){
    let json = JSON.stringify(data);
    if(json.length > MAX_SINGLE_COOKIE_LENGTH){
      // Fallback: write per-lesson cookies (clear master)
      Object.keys(data.lessons||{}).forEach(id => {
        const lessonData = data.lessons[id];
        const name = COOKIE_NAME + '_l' + id;
        const value = encodeURIComponent(JSON.stringify(lessonData));
        setRawCookie(name, value);
      });
      setRawCookie(COOKIE_NAME, encodeURIComponent(JSON.stringify({ split:true }))); // indicator
    } else {
      setRawCookie(COOKIE_NAME, encodeURIComponent(json));
    }
  }

  function setRawCookie(name, value){
    const date = new Date();
    date.setTime(date.getTime() + COOKIE_DAYS*24*60*60*1000);
    document.cookie = name + '=' + value + '; expires=' + date.toUTCString() + '; path=/';
  }

  function loadProgress(){
    const base = readCookie();
    if(base.split){
      // need to read each lesson cookie
      const all = { lessons: {} };
      document.cookie.split(';').forEach(c => {
        const [k,v] = c.trim().split('=');
        if(k.startsWith(COOKIE_NAME + '_l')){
          const lessonId = k.substring((COOKIE_NAME + '_l').length);
          try { all.lessons[lessonId] = JSON.parse(decodeURIComponent(v)); } catch(e){}
        }
      });
      return all;
    }
    return base;
  }

  function saveProgress(progress){
    writeCookie(progress);
  }

  function ensureLesson(progress, lessonId){
    if(!progress.lessons[lessonId]) progress.lessons[lessonId] = { visited:null, clips:{}, complete:false };
    return progress.lessons[lessonId];
  }

  function markLessonVisited(lessonId){
    const progress = loadProgress();
    const lesson = ensureLesson(progress, lessonId);
    if(!lesson.visited) lesson.visited = new Date().toISOString();
    saveProgress(progress);
  }

  function markClipStarted(lessonId, clipId){
    const progress = loadProgress();
    const lesson = ensureLesson(progress, lessonId);
    const clip = lesson.clips[clipId] || { started:null, completed:null };
    if(!clip.started) clip.started = new Date().toISOString();
    lesson.clips[clipId] = clip;
    saveProgress(progress);
  }

  function markClipCompleted(lessonId, clipId, totalClips){
    const progress = loadProgress();
    const lesson = ensureLesson(progress, lessonId);
    const clip = lesson.clips[clipId] || { started:new Date().toISOString(), completed:null };
    if(!clip.completed) clip.completed = new Date().toISOString();
    lesson.clips[clipId] = clip;
    if(totalClips && Object.values(lesson.clips).filter(c=>c.completed).length >= totalClips){
      lesson.complete = true;
    }
    saveProgress(progress);
  }

  function markLessonComplete(lessonId){
    const progress = loadProgress();
    const lesson = ensureLesson(progress, lessonId);
    lesson.complete = true;
    if(!lesson.visited) lesson.visited = new Date().toISOString();
    saveProgress(progress);
  }

  function computeLessonStatus(lessonId, totalClips){
    const progress = loadProgress();
    const lesson = progress.lessons[lessonId];
    if(!lesson) return 'Not Started';
    if(lesson.complete) return 'Complete';
    if(totalClips > 0){
      const started = Object.values(lesson.clips).some(c=>c.started);
      const completedCount = Object.values(lesson.clips).filter(c=>c.completed).length;
      if(completedCount >= totalClips) return 'Complete';
      if(started || completedCount>0) return 'In Progress';
    }
    return 'Not Started';
  }

  global.ProgressTracker = {
    loadProgress, saveProgress, markLessonVisited, markClipStarted, markClipCompleted, markLessonComplete, computeLessonStatus
  };
})(window);
