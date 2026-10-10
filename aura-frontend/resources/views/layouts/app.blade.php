<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>@yield('title', 'Aura Observatory')</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
    <link href="{{ asset('css/app.css') }}" rel="stylesheet">
</head>
<body>
    <div class="blob-field">
        <div class="blob blob-1"></div>
        <div class="blob blob-2"></div>
        <div class="blob blob-3"></div>
    </div>

    <nav class="topnav">
        <a href="{{ route('dashboard') }}" class="brand">
            <span class="brand-text"><img height="75" width="200" src="{{ asset('img/aura_dynamic.png') }}" alt="Aura Observatory" class="brand-logo"></span>
        </a>
        <div class="nav-links">
            <a href="{{ route('dashboard') }}" class="{{ request()->routeIs('dashboard') ? 'active' : '' }}">Dashboard</a>
            <a href="{{ route('listings.index') }}" class="{{ request()->routeIs('listings.*') ? 'active' : '' }}">Listings</a>
            <a href="{{ route('reports.index') }}" class="{{ request()->routeIs('reports.*') ? 'active' : '' }}">Reports</a>
            <a href="{{ route('monitoring.index') }}" class="{{ request()->routeIs('monitoring.*') ? 'active' : '' }}"><span class="pulse-dot"></span>Monitoring</a>
        </div>
    </nav>

    <main class="main">
        @if (session('error'))
            <div class="alert">{{ session('error') }}</div>
        @endif
        @if (session('status'))
            <div class="alert alert-success">{{ session('status') }}</div>
        @endif

        @yield('content')
    </main>

    <script>
        // Animates any [data-countup] element from 0 to its target value on
        // page load — used on the dashboard's instrument-readout numbers.
        document.querySelectorAll('[data-countup]').forEach((el) => {
            const target = parseFloat(el.dataset.countup);
            if (isNaN(target)) return;
            const suffix = el.dataset.suffix || '';
            const duration = 900;
            const start = performance.now();

            function tick(now) {
                const progress = Math.min((now - start) / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                const value = Math.round(target * eased);
                el.textContent = value.toLocaleString() + suffix;
                if (progress < 1) requestAnimationFrame(tick);
            }
            requestAnimationFrame(tick);
        });

        // Stagger the fade-in of list rows so panels feel like they're
        // populating live rather than appearing all at once.
        document.querySelectorAll('.bar-row, .ticker-row, .listing-card').forEach((el, i) => {
            el.style.animationDelay = `${Math.min(i * 40, 400)}ms`;
        });

        // Bar widths are set via CSS variable so the grow animation has a
        // real target instead of just full-width every time.
        document.querySelectorAll('.bar-fill[data-width]').forEach((el) => {
            el.style.setProperty('--target-width', el.dataset.width + '%');
        });

        // "Read more" / "read less" toggle for long titles — swaps the text
        // content directly via data-short/data-full rather than relying on
        // a CSS max-height/collapse class, so it can't silently do nothing
        // if a stylesheet update doesn't make it into the deployed CSS.
        // stopPropagation matters here: on the listings grid this button
        // sits inside a clickable <a class="listing-card">, and without it
        // a click would also trigger navigation to the listing page.
        document.querySelectorAll('.text-toggle').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const target = document.getElementById(btn.dataset.target);
                if (!target) return;
                const expanded = target.dataset.expanded === 'true';
                target.textContent = expanded ? target.dataset.short : target.dataset.full;
                target.dataset.expanded = expanded ? 'false' : 'true';
                btn.textContent = expanded ? '(read more)' : '(read less)';
            });
        });

        // Every delete form gets a confirmation dialog — deletes are
        // permanent (no undo/trash), so a stray click shouldn't be able to
        // remove data silently.
        document.querySelectorAll('.confirm-delete').forEach((form) => {
            form.addEventListener('submit', (e) => {
                if (!confirm('Delete this permanently? This cannot be undone.')) {
                    e.preventDefault();
                }
            });
        });

        // Scrape triggers are full page POSTs that block until the scrape
        // finishes (can be several minutes for tayara.tn) — disable the
        // button and swap in a loading label so it's clear the click
        // registered instead of looking frozen. The page reload once the
        // controller redirects back is what actually "refreshes" the list.
        document.querySelectorAll('.scrape-form').forEach((form) => {
            form.addEventListener('submit', () => {
                const btn = form.querySelector('button');
                if (btn) {
                    btn.disabled = true;
                    btn.textContent = form.dataset.loading || 'Working…';
                }
            });
        });
    </script>

    @stack('scripts')
</body>
</html>
