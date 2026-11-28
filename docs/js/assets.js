// Загрузка PNG из assets/. Если файла нет — используется заглушка из placeholders.js.
(function () {
  const NAMES = [
    'horse_run', 'horse_jump', 'horse_fall',
    'sky', 'mountains', 'dunes', 'ground',
    'saxaul', 'rock', 'tumbleweed', 'pit', 'sandstorm',
    'melon', 'water', 'coin', 'heart'
  ];
  const A = AT.assets = { img: {}, ph: {} };

  function loadOne(name) {
    return new Promise(resolve => {
      const im = new Image();
      let done = false;
      const fin = ok => { if (done) return; done = true; A.img[name] = ok && im.naturalWidth > 0 ? im : null; resolve(); };
      im.onload = () => fin(true);
      im.onerror = () => fin(false);
      setTimeout(() => fin(im.complete && im.naturalWidth > 0), 5000);
      im.src = 'assets/' + name + '.png';
    });
  }

  A.load = function () { return Promise.all(NAMES.map(loadOne)); };

  // PNG, если есть, иначе заглушка (создаётся один раз)
  A.get = function (name) {
    const im = A.img[name];
    if (im) return im;
    if (!A.ph[name] && AT.ph[name]) A.ph[name] = AT.ph[name]();
    return A.ph[name] || null;
  };
  A.has = name => !!A.img[name];
})();
