-- First Blog Post: "i built a kvm without a kvm"
-- Inserts the inaugural blog post about the software-based KVM solution

INSERT INTO blog_posts (
  title,
  slug,
  excerpt,
  content,
  content_html,
  status,
  tags,
  reading_time_minutes,
  published_at
) VALUES (
  'i built a kvm without a kvm',
  'kvm-without-a-kvm',
  'how i use ddc/ci, powershell scripts, and a web dashboard to switch my monitor between two computers without any extra hardware or cables.',
  -- Tiptap JSON content (for editing in the blog editor)
  '{
    "type": "doc",
    "content": [
      {
        "type": "paragraph",
        "content": [
          {
            "type": "text",
            "text": "so i have two computers on my desk but only one monitor. a windows desktop for gaming and general use, and a macbook for work. the normal solution is a kvm switch — a little box that lets you share a monitor, keyboard, and mouse between multiple computers. but those are annoying. you need extra cables, they can be flaky with high refresh rates, and honestly i just didn''t want another thing on my desk."
          }
        ]
      },
      {
        "type": "paragraph",
        "content": [
          {
            "type": "text",
            "text": "so instead i built my own version. no hardware, no extra cables. just software."
          }
        ]
      },
      {
        "type": "heading",
        "attrs": { "level": 2 },
        "content": [
          {
            "type": "text",
            "text": "the physical setup"
          }
        ]
      },
      {
        "type": "paragraph",
        "content": [
          {
            "type": "text",
            "text": "both computers are plugged into the same monitor using different inputs. the desktop goes in through hdmi, the macbook through displayport. the monitor has both ports so it''s just two cables — one from each machine — and that''s it for video."
          }
        ]
      },
      {
        "type": "paragraph",
        "content": [
          {
            "type": "text",
            "text": "for the mouse and keyboard, both are dual-mode wireless. they have a 2.4ghz usb dongle plugged into the windows desktop, and they''re also paired over bluetooth to the macbook. pressing a button on each one swaps which computer they''re talking to."
          }
        ]
      },
      {
        "type": "heading",
        "attrs": { "level": 2 },
        "content": [
          {
            "type": "text",
            "text": "the software trick: ddc/ci"
          }
        ]
      },
      {
        "type": "paragraph",
        "content": [
          {
            "type": "text",
            "text": "here''s where it gets fun. most monitors support a protocol called ddc/ci (display data channel / command interface). it lets your computer talk to the monitor over the same cable that carries the video signal. you can change brightness, contrast, and — crucially — the input source."
          }
        ]
      },
      {
        "type": "paragraph",
        "content": [
          {
            "type": "text",
            "text": "there''s a specific setting called vcp code 60 which controls input selection. on my monitor, hdmi is value 17 and displayport is value 15. so if i send the right command, i can tell the monitor to switch inputs without ever touching it."
          }
        ]
      },
      {
        "type": "paragraph",
        "content": [
          {
            "type": "text",
            "text": "i use a free tool called controlmymonitor (by nirsoft) to send these commands. it''s a tiny command-line utility that reads and writes vcp codes. i wrapped it in a couple powershell scripts — one for switching to hdmi, one for displayport, and one to read the current input."
          }
        ]
      },
      {
        "type": "heading",
        "attrs": { "level": 2 },
        "content": [
          {
            "type": "text",
            "text": "the scripts"
          }
        ]
      },
      {
        "type": "paragraph",
        "content": [
          {
            "type": "text",
            "text": "the powershell scripts are dead simple. switch-hdmi.ps1 tells controlmymonitor to set vcp code 60 to value 17. switch-displayport.ps1 sets it to 15. get-display-input.ps1 reads the current value so the ui knows which input is active."
          }
        ]
      },
      {
        "type": "paragraph",
        "content": [
          {
            "type": "text",
            "text": "these scripts live on the windows desktop and get called by a next.js api route running locally. the web app has a desktop service that shells out to powershell to execute them."
          }
        ]
      },
      {
        "type": "heading",
        "attrs": { "level": 2 },
        "content": [
          {
            "type": "text",
            "text": "the dashboard"
          }
        ]
      },
      {
        "type": "paragraph",
        "content": [
          {
            "type": "text",
            "text": "i already had a home dashboard (the site you''re on right now) so i added two buttons to the top nav — one for hdmi, one for displayport. when i click one, it hits the /api/desktop/kvm endpoint, which calls the desktop service, which runs the powershell script. the monitor switches in about a second."
          }
        ]
      },
      {
        "type": "paragraph",
        "content": [
          {
            "type": "text",
            "text": "the active input gets highlighted so i always know which computer i''m looking at. when the dashboard detects it''s running on the local windows server (not the production vercel deployment), it shows the switch buttons. otherwise they''re hidden."
          }
        ]
      },
      {
        "type": "heading",
        "attrs": { "level": 2 },
        "content": [
          {
            "type": "text",
            "text": "the peripheral swap"
          }
        ]
      },
      {
        "type": "paragraph",
        "content": [
          {
            "type": "text",
            "text": "the last piece is the mouse and keyboard. both have a physical button that swaps between 2.4ghz dongle mode and bluetooth. when i switch the monitor to displayport (mac), i press the button on each to flip to bluetooth. when i switch back to hdmi (desktop), i press them again to go back to the dongle. it takes maybe two seconds total."
          }
        ]
      },
      {
        "type": "heading",
        "attrs": { "level": 2 },
        "content": [
          {
            "type": "text",
            "text": "why not just buy a kvm?"
          }
        ]
      },
      {
        "type": "paragraph",
        "content": [
          {
            "type": "text",
            "text": "honestly? i didn''t want more cables. a kvm switch means running both computers'' video through the switch, plus usb for peripherals. that''s at least four extra cables plus the switch itself. my solution uses zero additional hardware and zero additional cables. both video cables were already plugged in, and the peripherals are wireless."
          }
        ]
      },
      {
        "type": "paragraph",
        "content": [
          {
            "type": "text",
            "text": "plus it was a fun project. and now i can switch computers from my phone if i want to, since the dashboard works on any browser."
          }
        ]
      },
      {
        "type": "heading",
        "attrs": { "level": 2 },
        "content": [
          {
            "type": "text",
            "text": "tl;dr"
          }
        ]
      },
      {
        "type": "paragraph",
        "content": [
          {
            "type": "text",
            "text": "two computers, one monitor, no kvm. ddc/ci lets you change monitor inputs via software. powershell scripts + a web dashboard button = one-click switching. mouse and keyboard toggle between 2.4ghz and bluetooth with a button press. it''s not fancy but it works great."
          }
        ]
      }
    ]
  }',
  -- Pre-rendered HTML content (for public display)
  '<p>so i have two computers on my desk but only one monitor. a windows desktop for gaming and general use, and a macbook for work. the normal solution is a kvm switch &mdash; a little box that lets you share a monitor, keyboard, and mouse between multiple computers. but those are annoying. you need extra cables, they can be flaky with high refresh rates, and honestly i just didn''t want another thing on my desk.</p>

<p>so instead i built my own version. no hardware, no extra cables. just software.</p>

<h2>the physical setup</h2>

<p>both computers are plugged into the same monitor using different inputs. the desktop goes in through hdmi, the macbook through displayport. the monitor has both ports so it''s just two cables &mdash; one from each machine &mdash; and that''s it for video.</p>

<p>for the mouse and keyboard, both are dual-mode wireless. they have a 2.4ghz usb dongle plugged into the windows desktop, and they''re also paired over bluetooth to the macbook. pressing a button on each one swaps which computer they''re talking to.</p>

<p>here''s what the whole thing looks like:</p>

<pre style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 0.875rem; line-height: 1.7; overflow-x: auto; background: transparent; border: 1px solid currentColor; border-radius: 0.75rem; padding: 1.5rem; opacity: 0.85;">
               ┌─────────────────────┐
               │      monitor        │
               │                     │
               │  hdmi     displayport│
               └───┬─────────────┬───┘
                   │             │
              hdmi cable    dp cable
                   │             │
       ┌───────────┴───┐   ┌────┴──────────┐
       │  windows pc   │   │   macbook      │
       │               │   │                │
       │  2.4ghz dongle│   │  bluetooth     │
       │  plugged in   │   │  paired to     │
       │  for kb+mouse │   │  same kb+mouse │
       └───────────────┘   └────────────────┘

                  ┌──────────────┐
                  │  keyboard    │
                  │  + mouse     │
                  │              │
                  │ 2.4ghz ⇄ bt │
                  │ (button swap)│
                  └──────────────┘
</pre>

<h2>the software trick: ddc/ci</h2>

<p>here''s where it gets fun. most monitors support a protocol called ddc/ci (display data channel / command interface). it lets your computer talk to the monitor over the same cable that carries the video signal. you can change brightness, contrast, and &mdash; crucially &mdash; the input source.</p>

<p>there''s a specific setting called vcp code 60 which controls input selection. on my monitor, hdmi is value 17 and displayport is value 15. so if i send the right command, i can tell the monitor to switch inputs without ever touching it.</p>

<p>i use a free tool called <a href="https://www.nirsoft.net/utils/control_my_monitor.html">controlmymonitor</a> (by nirsoft) to send these commands. it''s a tiny command-line utility that reads and writes vcp codes. i wrapped it in a couple powershell scripts &mdash; one for switching to hdmi, one for displayport, and one to read the current input.</p>

<h2>the scripts</h2>

<p>the powershell scripts are dead simple. <code>switch-hdmi.ps1</code> tells controlmymonitor to set vcp code 60 to value 17. <code>switch-displayport.ps1</code> sets it to 15. <code>get-display-input.ps1</code> reads the current value so the ui knows which input is active.</p>

<p>these scripts live on the windows desktop and get called by a next.js api route running locally. the web app has a desktop service that shells out to powershell to execute them.</p>

<p>here''s how the software side flows:</p>

<pre style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 0.875rem; line-height: 1.7; overflow-x: auto; background: transparent; border: 1px solid currentColor; border-radius: 0.75rem; padding: 1.5rem; opacity: 0.85;">
  ┌──────────────┐     ┌──────────────────┐     ┌─────────────────┐
  │  dashboard   │     │   next.js api    │     │   powershell    │
  │  button      │────▶│  /api/desktop/kvm│────▶│   script        │
  │  (browser)   │     │  (local server)  │     │   (windows)     │
  └──────────────┘     └──────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
                                                ┌─────────────────┐
                                                │controlmymonitor │
                                                │ set vcp 60 = 17 │
                                                │    (or 15)      │
                                                └────────┬────────┘
                                                         │
                                                     ddc/ci
                                                         │
                                                         ▼
                                                ┌─────────────────┐
                                                │    monitor       │
                                                │ switches input   │
                                                └─────────────────┘
</pre>

<h2>the dashboard</h2>

<p>i already had a home dashboard (the site you''re on right now) so i added two buttons to the top nav &mdash; one for hdmi, one for displayport. when i click one, it hits the <code>/api/desktop/kvm</code> endpoint, which calls the desktop service, which runs the powershell script. the monitor switches in about a second.</p>

<p>the active input gets highlighted so i always know which computer i''m looking at. when the dashboard detects it''s running on the local windows server (not the production vercel deployment), it shows the switch buttons. otherwise they''re hidden.</p>

<h2>the peripheral swap</h2>

<p>the last piece is the mouse and keyboard. both have a physical button that swaps between 2.4ghz dongle mode and bluetooth. when i switch the monitor to displayport (mac), i press the button on each to flip to bluetooth. when i switch back to hdmi (desktop), i press them again to go back to the dongle. it takes maybe two seconds total.</p>

<h2>why not just buy a kvm?</h2>

<p>honestly? i didn''t want more cables. a kvm switch means running both computers'' video through the switch, plus usb for peripherals. that''s at least four extra cables plus the switch itself. my solution uses zero additional hardware and zero additional cables. both video cables were already plugged in, and the peripherals are wireless.</p>

<p>plus it was a fun project. and now i can switch computers from my phone if i want to, since the dashboard works on any browser.</p>

<h2>tl;dr</h2>

<p>two computers, one monitor, no kvm. ddc/ci lets you change monitor inputs via software. powershell scripts + a web dashboard button = one-click switching. mouse and keyboard toggle between 2.4ghz and bluetooth with a button press. it''s not fancy but it works great.</p>',
  'published',
  ARRAY['homelab', 'hardware', 'automation'],
  4,
  NOW()
);
