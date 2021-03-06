import { isPlayerOpen, playerPause, playerResume, isPlayerPlaying, playerCurrentSong, playerPrev, playerPlay, playerNext } from './spotify-controller.js';

const alert = document.getElementById('open-player-notif');
const musicPlayer = document.getElementById('music-player');
const extensionDescription = document.getElementById('extension-description');
const generatePlaylist = document.getElementById('generatePlaylist');

const btnResume = document.getElementById('resume-btn');
const btnPause = document.getElementById('pause-btn');
const btnPrev = document.getElementById('prev-btn');
const btnNext = document.getElementById('next-btn');

const playerSongName = document.getElementById('player-song-name');
const playerArtistName = document.getElementById('player-artist-name');
const playerSongImage = document.getElementById('player-song-image');

// do not initially show
alert.style.display = 'none';

isPlayerOpen().then((isOpen) => {
  if (isOpen) {
    alert.style.display = 'none';
    extensionDescription.classList.add('d-none');
    musicPlayer.classList.remove('d-none');
    musicPlayer.classList.add('d-flex');
    generatePlaylist.classList.remove('d-none');
    updateCurrentSong();
  } else {
    alert.style.display = '';
    extensionDescription.classList.remove('d-none');
    musicPlayer.classList.remove('d-flex');
    musicPlayer.classList.add('d-none');
    generatePlaylist.classList.add('d-none');
  }
})

const togglePlayPauseIcons = (isPlaying) => {
  if (isPlaying) {
    btnPause.classList.remove('d-none');
    btnResume.classList.add('d-none');
  } else {
    btnResume.classList.remove('d-none');
    btnPause.classList.add('d-none');
  }
}

isPlayerPlaying().then(togglePlayPauseIcons);

async function updateCurrentSong() {
  const currentSong = await playerCurrentSong();
  console.log(currentSong);
  playerSongName.innerHTML = currentSong.song;
  playerArtistName.innerHTML = currentSong.artist;
  playerSongImage.src = currentSong.image;
}

updateCurrentSong();

btnPause.onclick = async function (e) {
  console.log('pause');
  togglePlayPauseIcons(false);
  await playerPause();
  await updateCurrentSong();
};

btnResume.onclick = async function (e) {
  console.log('resume');
  togglePlayPauseIcons(true);
  await playerResume();
  await updateCurrentSong();
};

btnPrev.onclick = async function (e) {
  console.log('prev');
  await playerPrev();
  await updateCurrentSong();
};


btnNext.onclick = async function (e) {
  console.log('next');
  await playerNext();
  await updateCurrentSong();
};

const btnGenerate = document.getElementById('generatePlaylist');
btnGenerate.addEventListener('submit', function(event) {
  event.preventDefault();

  chrome.storage.sync.set({
    searchType: document.getElementById('searchTypeSelect').value
  }, function() {
    console.log('Saved search type');
  });

  const loadingEl = document.getElementById('generateLoading');
  loadingEl.classList.remove('d-none');

  let payload = {
    event: 'parsePage'
  }
  chrome.runtime.sendMessage(payload);
  
  // code use with declaratively injecting content script
  // chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
  //   chrome.tabs.sendMessage(tabs[0].id, payload);
  // })
}, false);

chrome.runtime.onMessage.addListener(
  function(message, sender, callback) {
    console.log(`popover ${JSON.stringify(message)}`)
    if (message.event == 'parsePageDone'){
      console.log('parsePage data received');

      const options = {
        // mode: 'no-cors',
        headers: {
          Origin: 'X-Requested-With'
        }
      };

      chrome.storage.sync.get(['searchType'], async function(result) {
        const searchType = result.searchType;
        let searchString = message.data.searchString;
        if (searchType !== 'lyrics') {
          searchString = searchString.slice(0, searchString.indexOf('+'))
        }

        const proxyurl = 'https://cors-anywhere.herokuapp.com/';
        fetch(`${proxyurl}https://www.lyricfinder.org/search/${searchType}/${searchString}`, options)
          .then(res => res.text())
          .then((res) => {
            var el = document.createElement( 'html' );
            el.innerHTML = res;
      
            let listSongs = el.querySelectorAll('.song-title-link');
            listSongs = Array.from(listSongs).slice(0, 5).map(item => item.textContent.trim());
            let listArtists = el.querySelectorAll('.artist-link');
            listArtists = Array.from(listArtists).slice(0, 5).map(item => item.textContent.trim());

            console.log(listSongs, listArtists);
            let songs = listSongs.map((song, idx) => ({ name: song, artist: listArtists[idx] }));
            playerPlay(songs).then(() => {
              const loadingEl = document.getElementById('generateLoading');
              loadingEl.classList.add('d-none');
              updateCurrentSong();
              togglePlayPauseIcons(true);
            });
          }
        )
      })
    }
  }
);
