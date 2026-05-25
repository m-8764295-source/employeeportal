          (function() {
            function updateOyaBanner() {
              // Malaysia time (UTC+8)
              var now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' }));
              var day   = now.getDate();
              var month = now.getMonth() + 1;
              var t     = now.getHours() + now.getMinutes() / 60;

              var slots = [
                { month: 5, day: 21, start: 13, end: 18 },
                { month: 5, day: 22, start: 10, end: 16 },
              ];

              var isOpen = true;

              // After 21 May 6pm, hide 21 May slots
              var past21 = (month === 5 && day === 21 && t >= 18) || (month === 5 && day > 21) || month > 5;
              ['slot-21a-pickup','slot-21b-pickup','slot-21a-delivery','slot-21b-delivery'].forEach(function(id) {
                var el = document.getElementById(id);
                if (el) el.style.display = past21 ? 'none' : '';
              });

              // Next slot label
              var nextLabel = '';
              if (month === 5 && day === 21 && t < 13)        nextLabel = 'Opens today 1pm â€“ 6pm';
              else if (month === 5 && day === 21 && t >= 18)   nextLabel = 'Next: 22 May 10am â€“ 4pm';
              else if (month < 5 || (month === 5 && day < 21)) nextLabel = 'Opens 21 May 1pm â€“ 6pm';

              var img = document.getElementById('oya-banner-img');
              var overlay = document.getElementById('oya-closed-overlay');
              var closedBadge = document.getElementById('oya-closed-badge');
              var openBadge = document.getElementById('oya-open-badge');
              var nextEl = document.getElementById('oya-next-time');

              // Banner card title + button
              var bannerTitle = document.getElementById('oya-banner-title');
              var bannerSub   = document.getElementById('oya-banner-sub');
              var bannerBtn   = document.getElementById('oya-banner-btn');

              if (isOpen) {
                img.style.filter = '';
                overlay.style.display = 'none';
                closedBadge.style.display = 'none';
                openBadge.style.display = 'block';
                if (bannerTitle) bannerTitle.textContent = 'Pick up made easy';
                if (bannerSub)   bannerSub.innerHTML = 'We\'re open now â€”<br>pick up your order!';
                if (bannerBtn)   bannerBtn.textContent = 'Pick Up Now';
              } else {
                img.style.filter = 'brightness(0.55)';
                overlay.style.display = 'block';
                closedBadge.style.display = nextLabel ? 'block' : 'none';
                openBadge.style.display = 'none';
                if (nextEl) { nextEl.textContent = nextLabel; nextEl.style.display = nextLabel ? 'block' : 'none'; }
                if (bannerTitle) bannerTitle.textContent = 'Pre-order made easy';
                if (bannerSub)   bannerSub.innerHTML = 'Order now, pick up<br>when it\'s ready!';
                if (bannerBtn)   bannerBtn.textContent = 'Pre-order Now';
              }
            }
            updateOyaBanner();
            setInterval(updateOyaBanner, 30000);
          })();
