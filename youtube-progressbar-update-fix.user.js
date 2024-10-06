/* eslint-disable  userscripts/use-download-and-update-url */
/* -eslint-disable  userscripts/better-use-match  --  Is this a thing? */
// ==UserScript==
// @name         YouTube progressbar update FIX
// @version      0.1.0
// @description  Fix YouTube progressbar not updating without mouse movement.
// @author       Calcifer
// @license      MIT
// @copyright    Forked from https://greasyfork.org/en/scripts/426283-youtube-permanent-progressbar
// @namespace    https://github.com/Calciferz
// @homepageURL  https://github.com/Calciferz/YoutubeKeysFix
// @supportURL   https://github.com/Calciferz/YoutubeKeysFix/issues
// -@downloadURL  https://github.com/Calciferz/YoutubeKeysFix/raw/main/YoutubeKeysFix.user.js
// @icon         http://youtube.com/yts/img/favicon_32-vflOogEID.png
// @match        https://*.youtube.com/*
// @match        https://youtube.googleapis.com/embed*
// @grant        none
// ==/UserScript==

/* eslint-disable  no-multi-spaces */

var elems= {};
var metadata= {};
var updateIntervalID;
var playerObserver;
const progressUpdateInterval= 500;  // millisec


(function () {
  'use strict';

  function getLastBufferEnd() {
    let buffered= elems.video.buffered;
    return buffered.length == 0 ? 0 : buffered.end(buffered.length - 1);
  }

  function getDuration() {
    return metadata.liveVideo ? getLastBufferEnd() : elems.video.duration;
  }

  function prettifyVideoTime(time) {
    let seconds= "" + Math.floor(time % 60);
    let minutes= "" + Math.floor(time / 60 % 60);
    let hours= Math.floor(time/3600);
    let formatted= !hours ? "" : hours + ':';
    formatted+= minutes.padStart(!hours ? 1 : 2, '0') + ':' + seconds.padStart(2, '0');
    return formatted;
  }

  function updateCurrentTime() {
    elems.timeCurrent.innerText= prettifyVideoTime(elems.video.currentTime);
    if (metadata.liveVideo)  updateLiveDuration();
    updatePlayProgress();
  }

  function updateLiveDuration() {
    let dur= getDuration();
    let liveStreaming = (elems.video.currentTime + 5 >= dur);
    elems.player.classList.toggle('live-streaming', liveStreaming);
    elems.timeDuration.innerText= prettifyVideoTime(dur);
  }

  function updatePositionScrubber() {
    // elems.progressBar.style.setProperty('--play-timestamp', elems.video.currentTime);
    let dur= getDuration();
    let relTime= !dur ? 0 : elems.video.currentTime / dur;
    elems.progressBar.style.setProperty('--play-time--relative', relTime.toFixed(4));
    // elems.scrubberContainer.style.transform= `translateX( ${(relTime*100).toFixed(2)}cqw )`;  // overridden by youtube
  }

  function updateProgressBar(chaptersProgress, timestamp) {
    // YouTube api does not provides current time in chapters
    // this function finds current time in the chapter by finding the ratio between total video duration and total width of the chapters div

    let dur= getDuration();
    if (!dur) return;

    let chapterContainers= elems.chapterContainers;

    // find the ratio between total video duration and total width of the chapters div
    let totalProgressBarWidth= 0;
    for (let elem of chapterContainers) {
      totalProgressBarWidth+= elem.offsetWidth;
    }
    const durationWidthRatio= dur / totalProgressBarWidth;

    // loop inside chapters
    let chaptersPixelWidthUntilCurrentChapter= 0;
    let currentChapter= 0;
    for (let i= 0; i < chapterContainers.length; i++) {
      // chapters before current: current time is bigger than durationWidthRatio * (chapters pixel width including current one)
      if (timestamp > durationWidthRatio * (chaptersPixelWidthUntilCurrentChapter + chapterContainers[i].offsetWidth)) {
        // chaptersProgress[i].style.transform= "scaleX(1)";
        // chapter passed: full width progress
        chaptersProgress[i].style.setProperty('--chapter-progress', 1);

        // increase the current chapters location by adding last watched chapter
        chaptersPixelWidthUntilCurrentChapter += chapterContainers[i].offsetWidth;
      } else {
        // If not, it means that we are on this chapter.
        // Find the appropriate size for the chapter and scale it
        // current time
        let currentTimeInChapterInSeconds= timestamp - (durationWidthRatio * chaptersPixelWidthUntilCurrentChapter);
        // total chapter time
        let currentChapterLengthInSeconds= durationWidthRatio * chapterContainers[i].offsetWidth;
        let currentChapterTimeRatio= currentTimeInChapterInSeconds / currentChapterLengthInSeconds
        currentChapter= i;
        // chaptersProgress[i].style.transform= `scaleX(${currentChapterTimeRatio})`;
        chaptersProgress[i].style.setProperty('--chapter-progress', currentChapterTimeRatio);
        break;
      }
    }
    for (let i= currentChapter + 1; i < chapterContainers.length; i++) {
      // chapters after current: zero width progress
      chaptersProgress[i].style.setProperty('--chapter-progress', 0);
    }
  }

  function updatePlayProgress() {
    // update play progress
    updatePositionScrubber();
    updateProgressBar(elems.chaptersPlayProgress, elems.video.currentTime);
  }

  function updateLoadProgress() {
    // update load progress (buffer)
    // can't calculate if live video
    // if (metadata.liveVideo)  return updateLiveDuration();
    if (metadata.liveVideo)  return;
    updateProgressBar(elems.chaptersLoadProgress, getLastBufferEnd());
  }

  function startUpdater() {
    stopUpdater();
    updateIntervalID= setInterval(updatePlayProgress, progressUpdateInterval);
    updatePlayProgress();
    let chapterContainers= elems.progressBar.getElementsByClassName('ytp-chapter-hover-container');
    if (chapterContainers.length != elems.chapterContainers.length) {
      console.error('[YoutubeProgressbarUpdateFix] chapter number changed:', elems.chapterContainers, chapterContainers);
      debugger;
    }
  }

  function stopUpdater() {
    if (!updateIntervalID)  return;
    clearInterval(updateIntervalID);
    updateIntervalID= null;
  }

  function updateChapters() {
    metadata.liveVideo= elems.timeDisplay.classList.contains('ytp-live');
    elems.player.classList.toggle('live-video', metadata.liveVideo);

    let progressBar= elems.progressBar;
    elems.chapterContainers= progressBar.getElementsByClassName('ytp-chapter-hover-container');
    elems.chaptersPlayProgress= progressBar.getElementsByClassName('ytp-play-progress');
    elems.chaptersLoadProgress= progressBar.getElementsByClassName('ytp-load-progress');
    if (elems.chapterContainers.length != elems.chaptersPlayProgress.length
      || elems.chapterContainers.length != elems.chaptersLoadProgress.length) {
      console.error('[YoutubeProgressbarUpdateFix] chapter number mismatch:', elems.chapterContainers, elems.chaptersPlayProgress, elems.chaptersLoadProgress);
      debugger;
    }
  }

  function initPlayer() {
    let player= elems.player;
    let video= elems.video= player.querySelector('video');
    elems.timeDisplay= player.querySelector('.ytp-time-display');
    elems.timeCurrent= player.querySelector('.ytp-time-current');
    elems.timeDuration= player.querySelector('.ytp-time-duration');
    elems.progressBar= player.querySelector('.ytp-progress-bar');
    elems.scrubberContainer= player.querySelector('.ytp-scrubber-container');

    updatePositionScrubber();
    // elems.progressBar.style.setProperty('--play-time--relative', 0);
    elems.progressBar.classList.add('play-time-set');

    video.addEventListener('loadedmetadata', updateChapters);
    video.addEventListener('timeupdate', updateCurrentTime);
    // video.addEventListener('seeking', updateCurrentTime);
    // video.addEventListener('seeked', updateCurrentTime);
    video.addEventListener('progress', updateLoadProgress);
    video.addEventListener('play', startUpdater);
    video.addEventListener('pause', stopUpdater);
    player.classList.add('progress-bar-updated');
  }

  function observePlayer() {
    // The movie elems.player frame #movie_player is not part of the initial page load.
    elems.player= document.getElementById('movie_player');
    if (elems.player)  return initPlayer();

    // Player elem observer setup
    playerObserver= new MutationObserver( mutationHandler );
    playerObserver.observe(document.body, { childList: true, subtree: true });

    function mutationHandler(mutations, observer) {
      elems.player= document.getElementById('movie_player');
      if (!elems.player)  return;

      console.log("[YoutubeProgressbarUpdateFix]  mutationHandler():  #movie_player created, stopped observing body", [elems.player]);
      // Stop playerObserver
      observer.disconnect();

      initPlayer();
    }
  }

  observePlayer();
})();

