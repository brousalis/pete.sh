-- First Blog Post: "i built a kvm without a kvm"
-- Inserts the inaugural blog post about the software-based KVM solution
-- Uses dollar-quoted strings to keep apostrophes and code readable

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
  'how i use ddc/ci, powershell scripts, and a web dashboard to switch my monitor between two computers — no extra hardware, no extra cables.',
  -- Tiptap JSON content (for editing in the blog editor)
  $tiptap${
    "type": "doc",
    "content": [
      {
        "type": "paragraph",
        "content": [
          { "type": "text", "text": "so i have two computers on my desk but only one monitor. a " },
          { "type": "text", "marks": [{ "type": "bold" }], "text": "windows desktop" },
          { "type": "text", "text": " for gaming and general use, and a " },
          { "type": "text", "marks": [{ "type": "bold" }], "text": "macbook" },
          { "type": "text", "text": " for work. the normal solution is a " },
          { "type": "text", "marks": [{ "type": "link", "attrs": { "href": "https://en.wikipedia.org/wiki/KVM_switch", "target": "_blank" } }], "text": "kvm switch" },
          { "type": "text", "text": " — a little box that lets you share a monitor, keyboard, and mouse between multiple computers. but those are annoying. you need extra cables, they can be flaky with high refresh rates, and honestly i just didn't want another thing on my desk." }
        ]
      },
      {
        "type": "paragraph",
        "content": [
          { "type": "text", "text": "so instead i built my own version. " },
          { "type": "text", "marks": [{ "type": "bold" }], "text": "no hardware, no extra cables. just software." }
        ]
      },
      { "type": "horizontalRule" },
      {
        "type": "heading",
        "attrs": { "level": 2 },
        "content": [{ "type": "text", "text": "the physical setup" }]
      },
      {
        "type": "paragraph",
        "content": [
          { "type": "text", "text": "both computers are plugged into the same monitor using different inputs:" }
        ]
      },
      {
        "type": "bulletList",
        "content": [
          {
            "type": "listItem",
            "content": [{
              "type": "paragraph",
              "content": [
                { "type": "text", "marks": [{ "type": "bold" }], "text": "windows desktop" },
                { "type": "text", "text": " → monitor via " },
                { "type": "text", "marks": [{ "type": "code" }], "text": "hdmi" }
              ]
            }]
          },
          {
            "type": "listItem",
            "content": [{
              "type": "paragraph",
              "content": [
                { "type": "text", "marks": [{ "type": "bold" }], "text": "macbook" },
                { "type": "text", "text": " → monitor via " },
                { "type": "text", "marks": [{ "type": "code" }], "text": "displayport" }
              ]
            }]
          }
        ]
      },
      {
        "type": "paragraph",
        "content": [
          { "type": "text", "text": "the monitor has both ports so it's just two cables — one from each machine — and that's it for video." }
        ]
      },
      {
        "type": "paragraph",
        "content": [
          { "type": "text", "text": "for input devices, my mouse and keyboard are both " },
          { "type": "text", "marks": [{ "type": "bold" }], "text": "dual-mode wireless" },
          { "type": "text", "text": ":" }
        ]
      },
      {
        "type": "bulletList",
        "content": [
          {
            "type": "listItem",
            "content": [{
              "type": "paragraph",
              "content": [
                { "type": "text", "marks": [{ "type": "bold" }], "text": "2.4ghz usb dongle" },
                { "type": "text", "text": " plugged into the windows desktop" }
              ]
            }]
          },
          {
            "type": "listItem",
            "content": [{
              "type": "paragraph",
              "content": [
                { "type": "text", "marks": [{ "type": "bold" }], "text": "bluetooth" },
                { "type": "text", "text": " paired to the macbook" }
              ]
            }]
          }
        ]
      },
      {
        "type": "paragraph",
        "content": [
          { "type": "text", "text": "pressing a button on each peripheral swaps which computer they talk to. here's what the whole setup looks like:" }
        ]
      },
      {
        "type": "codeBlock",
        "attrs": { "language": null },
        "content": [{
          "type": "text",
          "text": "               ┌─────────────────────┐\n               │      monitor        │\n               │                     │\n               │  hdmi     displayport│\n               └───┬─────────────┬───┘\n                   │             │\n              hdmi cable    dp cable\n                   │             │\n       ┌───────────┴───┐   ┌────┴──────────┐\n       │  windows pc   │   │   macbook      │\n       │               │   │                │\n       │  2.4ghz dongle│   │  bluetooth     │\n       │  plugged in   │   │  paired to     │\n       │  for kb+mouse │   │  same kb+mouse │\n       └───────────────┘   └────────────────┘\n\n                  ┌──────────────┐\n                  │  keyboard    │\n                  │  + mouse     │\n                  │              │\n                  │ 2.4ghz ⇄ bt │\n                  │ (button swap)│\n                  └──────────────┘"
        }]
      },
      { "type": "horizontalRule" },
      {
        "type": "heading",
        "attrs": { "level": 2 },
        "content": [{ "type": "text", "text": "the software trick: ddc/ci" }]
      },
      {
        "type": "paragraph",
        "content": [
          { "type": "text", "text": "here's where it gets fun. most monitors support a protocol called " },
          { "type": "text", "marks": [{ "type": "bold" }, { "type": "link", "attrs": { "href": "https://en.wikipedia.org/wiki/Display_Data_Channel", "target": "_blank" } }], "text": "ddc/ci" },
          { "type": "text", "text": " (display data channel / command interface). it lets your computer talk to the monitor over the same cable that carries the video signal. you can change brightness, contrast, and — crucially — the " },
          { "type": "text", "marks": [{ "type": "bold" }], "text": "input source" },
          { "type": "text", "text": "." }
        ]
      },
      {
        "type": "paragraph",
        "content": [
          { "type": "text", "text": "there's a specific setting called " },
          { "type": "text", "marks": [{ "type": "code" }], "text": "vcp code 60" },
          { "type": "text", "text": " which controls input selection. on my monitor:" }
        ]
      },
      {
        "type": "bulletList",
        "content": [
          {
            "type": "listItem",
            "content": [{
              "type": "paragraph",
              "content": [
                { "type": "text", "text": "hdmi = value " },
                { "type": "text", "marks": [{ "type": "code" }], "text": "17" }
              ]
            }]
          },
          {
            "type": "listItem",
            "content": [{
              "type": "paragraph",
              "content": [
                { "type": "text", "text": "displayport = value " },
                { "type": "text", "marks": [{ "type": "code" }], "text": "15" }
              ]
            }]
          }
        ]
      },
      {
        "type": "paragraph",
        "content": [
          { "type": "text", "text": "so if i send the right command, i can tell the monitor to switch inputs without ever touching it." }
        ]
      },
      {
        "type": "paragraph",
        "content": [
          { "type": "text", "text": "i use a free tool called " },
          { "type": "text", "marks": [{ "type": "link", "attrs": { "href": "https://www.nirsoft.net/utils/control_my_monitor.html", "target": "_blank" } }], "text": "controlmymonitor" },
          { "type": "text", "text": " (by nirsoft) to send these commands. it's a tiny command-line utility that reads and writes vcp codes." }
        ]
      },
      { "type": "horizontalRule" },
      {
        "type": "heading",
        "attrs": { "level": 2 },
        "content": [{ "type": "text", "text": "the scripts" }]
      },
      {
        "type": "paragraph",
        "content": [
          { "type": "text", "text": "i wrapped controlmymonitor in three powershell scripts. they're dead simple:" }
        ]
      },
      {
        "type": "paragraph",
        "content": [
          { "type": "text", "marks": [{ "type": "bold" }], "text": "switch-hdmi.ps1" },
          { "type": "text", "text": " — switch the monitor to the windows desktop:" }
        ]
      },
      {
        "type": "codeBlock",
        "attrs": { "language": "powershell" },
        "content": [{
          "type": "text",
          "text": "# switch-hdmi.ps1\n$monitorTool = \"C:\\tools\\ControlMyMonitor.exe\"\n\n# vcp code 60 = input source, value 17 = hdmi\n& $monitorTool /SetValue \"$(\\\\.\\DISPLAY1)\" 60 17"
        }]
      },
      {
        "type": "paragraph",
        "content": [
          { "type": "text", "marks": [{ "type": "bold" }], "text": "switch-displayport.ps1" },
          { "type": "text", "text": " — switch to the macbook:" }
        ]
      },
      {
        "type": "codeBlock",
        "attrs": { "language": "powershell" },
        "content": [{
          "type": "text",
          "text": "# switch-displayport.ps1\n$monitorTool = \"C:\\tools\\ControlMyMonitor.exe\"\n\n# vcp code 60 = input source, value 15 = displayport\n& $monitorTool /SetValue \"$(\\\\.\\DISPLAY1)\" 60 15"
        }]
      },
      {
        "type": "paragraph",
        "content": [
          { "type": "text", "marks": [{ "type": "bold" }], "text": "get-display-input.ps1" },
          { "type": "text", "text": " — check which input is currently active:" }
        ]
      },
      {
        "type": "codeBlock",
        "attrs": { "language": "powershell" },
        "content": [{
          "type": "text",
          "text": "# get-display-input.ps1\n$monitorTool = \"C:\\tools\\ControlMyMonitor.exe\"\n\n$value = & $monitorTool /GetValue \"$(\\\\.\\DISPLAY1)\" 60\nWrite-Output $value.Trim()"
        }]
      },
      {
        "type": "paragraph",
        "content": [
          { "type": "text", "text": "then on the web app side, a " },
          { "type": "text", "marks": [{ "type": "code" }], "text": "DesktopService" },
          { "type": "text", "text": " calls these scripts via node's " },
          { "type": "text", "marks": [{ "type": "code" }], "text": "child_process" },
          { "type": "text", "text": ":" }
        ]
      },
      {
        "type": "codeBlock",
        "attrs": { "language": "typescript" },
        "content": [{
          "type": "text",
          "text": "// desktop.service.ts\nconst SWITCH_TO_HDMI = \"D:\\\\applications\\\\switch-hdmi.ps1\"\nconst SWITCH_TO_DP   = \"D:\\\\applications\\\\switch-displayport.ps1\"\n\nasync switchToHdmi(): Promise<void> {\n  await execAsync(\n    `powershell -ExecutionPolicy Bypass -File \"${SWITCH_TO_HDMI}\"`\n  )\n}\n\nasync switchToDisplayPort(): Promise<void> {\n  await execAsync(\n    `powershell -ExecutionPolicy Bypass -File \"${SWITCH_TO_DP}\"`\n  )\n}"
        }]
      },
      {
        "type": "paragraph",
        "content": [
          { "type": "text", "text": "and an api route exposes it to the frontend:" }
        ]
      },
      {
        "type": "codeBlock",
        "attrs": { "language": "typescript" },
        "content": [{
          "type": "text",
          "text": "// POST /api/desktop/kvm\nconst { target } = await request.json()\n\nif (target === 'hdmi') {\n  await desktopService.switchToHdmi()\n} else {\n  await desktopService.switchToDisplayPort()\n}"
        }]
      },
      {
        "type": "paragraph",
        "content": [
          { "type": "text", "text": "here's how the full chain flows when i click the button:" }
        ]
      },
      {
        "type": "codeBlock",
        "attrs": { "language": null },
        "content": [{
          "type": "text",
          "text": "  ┌──────────────┐     ┌──────────────────┐     ┌─────────────────┐\n  │  dashboard   │     │   next.js api    │     │   powershell    │\n  │  button      │────▶│  /api/desktop/kvm│────▶│   script        │\n  │  (browser)   │     │  (local server)  │     │   (windows)     │\n  └──────────────┘     └──────────────────┘     └────────┬────────┘\n                                                         │\n                                                         ▼\n                                                ┌─────────────────┐\n                                                │controlmymonitor │\n                                                │ set vcp 60 = 17 │\n                                                │    (or 15)      │\n                                                └────────┬────────┘\n                                                         │\n                                                     ddc/ci\n                                                         │\n                                                         ▼\n                                                ┌─────────────────┐\n                                                │    monitor       │\n                                                │ switches input   │\n                                                └─────────────────┘"
        }]
      },
      { "type": "horizontalRule" },
      {
        "type": "heading",
        "attrs": { "level": 2 },
        "content": [{ "type": "text", "text": "wiring it into the dashboard" }]
      },
      {
        "type": "paragraph",
        "content": [
          { "type": "text", "text": "i already had a home dashboard (the site you're on right now) so i added two buttons to the top nav — one for hdmi, one for displayport. when i click one, it hits the " },
          { "type": "text", "marks": [{ "type": "code" }], "text": "/api/desktop/kvm" },
          { "type": "text", "text": " endpoint, which calls the desktop service, which runs the powershell script. the monitor switches in about a second." }
        ]
      },
      {
        "type": "paragraph",
        "content": [
          { "type": "text", "text": "the active input gets highlighted so i always know which computer i'm looking at. when the dashboard detects it's running on the local windows server (via a health check), it shows the switch buttons. otherwise they're hidden — no point showing them on the production deployment." }
        ]
      },
      { "type": "horizontalRule" },
      {
        "type": "heading",
        "attrs": { "level": 2 },
        "content": [{ "type": "text", "text": "the full switching workflow" }]
      },
      {
        "type": "paragraph",
        "content": [
          { "type": "text", "text": "when i want to swap from one computer to the other, here's what happens:" }
        ]
      },
      {
        "type": "orderedList",
        "attrs": { "start": 1 },
        "content": [
          {
            "type": "listItem",
            "content": [{
              "type": "paragraph",
              "content": [
                { "type": "text", "marks": [{ "type": "bold" }], "text": "click the switch button" },
                { "type": "text", "text": " on the dashboard (works from any browser, even my phone)" }
              ]
            }]
          },
          {
            "type": "listItem",
            "content": [{
              "type": "paragraph",
              "content": [
                { "type": "text", "marks": [{ "type": "bold" }], "text": "monitor switches input" },
                { "type": "text", "text": " — takes about one second via ddc/ci" }
              ]
            }]
          },
          {
            "type": "listItem",
            "content": [{
              "type": "paragraph",
              "content": [
                { "type": "text", "marks": [{ "type": "bold" }], "text": "press the mode button on the keyboard" },
                { "type": "text", "text": " — flips from 2.4ghz to bluetooth (or back)" }
              ]
            }]
          },
          {
            "type": "listItem",
            "content": [{
              "type": "paragraph",
              "content": [
                { "type": "text", "marks": [{ "type": "bold" }], "text": "press the mode button on the mouse" },
                { "type": "text", "text": " — same deal" }
              ]
            }]
          }
        ]
      },
      {
        "type": "paragraph",
        "content": [
          { "type": "text", "text": "total time: about " },
          { "type": "text", "marks": [{ "type": "bold" }], "text": "three seconds" },
          { "type": "text", "text": ". and i never have to reach behind the monitor or unplug anything." }
        ]
      },
      { "type": "horizontalRule" },
      {
        "type": "heading",
        "attrs": { "level": 2 },
        "content": [{ "type": "text", "text": "why not just buy a kvm?" }]
      },
      {
        "type": "blockquote",
        "content": [{
          "type": "paragraph",
          "content": [{ "type": "text", "text": "honestly? i didn't want more cables." }]
        }]
      },
      {
        "type": "paragraph",
        "content": [
          { "type": "text", "text": "a kvm switch means running both computers' video through the switch, plus usb for peripherals. that's at least " },
          { "type": "text", "marks": [{ "type": "bold" }], "text": "four extra cables" },
          { "type": "text", "text": " plus the switch itself. my solution uses " },
          { "type": "text", "marks": [{ "type": "bold" }], "text": "zero additional hardware" },
          { "type": "text", "text": " and " },
          { "type": "text", "marks": [{ "type": "bold" }], "text": "zero additional cables" },
          { "type": "text", "text": ". both video cables were already plugged in, and the peripherals are wireless." }
        ]
      },
      {
        "type": "paragraph",
        "content": [
          { "type": "text", "text": "plus it was a fun project. and now i can switch computers from my phone if i want to, since the dashboard works on any browser." }
        ]
      },
      { "type": "horizontalRule" },
      {
        "type": "heading",
        "attrs": { "level": 2 },
        "content": [{ "type": "text", "text": "tl;dr" }]
      },
      {
        "type": "paragraph",
        "content": [
          { "type": "text", "marks": [{ "type": "bold" }], "text": "two computers, one monitor, no kvm." },
          { "type": "text", "text": " " },
          { "type": "text", "marks": [{ "type": "code" }], "text": "ddc/ci" },
          { "type": "text", "text": " lets you change monitor inputs via software. powershell scripts + a web dashboard button = one-click display switching. mouse and keyboard toggle between 2.4ghz and bluetooth with a button press. it's not fancy but it works great." }
        ]
      }
    ]
  }$tiptap$,
  -- Pre-rendered HTML content (for public display)
  $html$<p>so i have two computers on my desk but only one monitor. a <strong>windows desktop</strong> for gaming and general use, and a <strong>macbook</strong> for work. the normal solution is a <a href="https://en.wikipedia.org/wiki/KVM_switch">kvm switch</a> &mdash; a little box that lets you share a monitor, keyboard, and mouse between multiple computers. but those are annoying. you need extra cables, they can be flaky with high refresh rates, and honestly i just didn't want another thing on my desk.</p>

<p>so instead i built my own version. <strong>no hardware, no extra cables. just software.</strong></p>

<hr>

<h2>the physical setup</h2>

<p>both computers are plugged into the same monitor using different inputs:</p>

<ul>
<li><strong>windows desktop</strong> &rarr; monitor via <code>hdmi</code></li>
<li><strong>macbook</strong> &rarr; monitor via <code>displayport</code></li>
</ul>

<p>the monitor has both ports so it's just two cables &mdash; one from each machine &mdash; and that's it for video.</p>

<p>for input devices, my mouse and keyboard are both <strong>dual-mode wireless</strong>:</p>

<ul>
<li><strong>2.4ghz usb dongle</strong> plugged into the windows desktop</li>
<li><strong>bluetooth</strong> paired to the macbook</li>
</ul>

<p>pressing a button on each peripheral swaps which computer they talk to. here's what the whole setup looks like:</p>

<pre><code>               ┌─────────────────────┐
               │       monitor       │
               │                     │
               │  hdmi    displayport│
               └───┬─────────────┬───┘
                   │             │
              hdmi cable    dp cable
                   │             │
       ┌───────────┴───┐   ┌────┴──────────┐
       │  windows pc   │   │    macbook     │
       │               │   │               │
       │  2.4ghz dongle│   │   bluetooth   │
       │  plugged in   │   │   paired to   │
       │  for kb+mouse │   │  same kb+mouse│
       └───────────────┘   └───────────────┘

                ┌────────────────┐
                │   keyboard     │
                │   + mouse      │
                │                │
                │  2.4ghz ⇄ bt   │
                │ (button swap)  │
                └────────────────┘</code></pre>

<hr>

<h2>the software trick: ddc/ci</h2>

<p>here's where it gets fun. most monitors support a protocol called <strong><a href="https://en.wikipedia.org/wiki/Display_Data_Channel">ddc/ci</a></strong> (display data channel / command interface). it lets your computer talk to the monitor over the same cable that carries the video signal. you can change brightness, contrast, and &mdash; crucially &mdash; the <strong>input source</strong>.</p>

<p>there's a specific setting called <code>vcp code 60</code> which controls input selection. on my monitor:</p>

<ul>
<li>hdmi = value <code>17</code></li>
<li>displayport = value <code>15</code></li>
</ul>

<p>so if i send the right command, i can tell the monitor to switch inputs without ever touching it.</p>

<p>i use a free tool called <a href="https://www.nirsoft.net/utils/control_my_monitor.html">controlmymonitor</a> (by nirsoft) to send these commands. it's a tiny command-line utility that reads and writes vcp codes.</p>

<hr>

<h2>the scripts</h2>

<p>i wrapped controlmymonitor in three powershell scripts. they're dead simple:</p>

<p><strong><code>switch-hdmi.ps1</code></strong> &mdash; switch the monitor to the windows desktop:</p>

<pre><code><span style="color:#6b9955;"># switch-hdmi.ps1 — switch monitor input to hdmi (windows desktop)</span>
<span style="color:#9cdcfe;">$monitorTool</span> = <span style="color:#ce9178;">"D:\applications\ControlMyMonitor.exe"</span>

<span style="color:#6b9955;"># vcp code 60 = input source, value 17 = hdmi</span>
&amp; <span style="color:#9cdcfe;">$monitorTool</span> /SetValue <span style="color:#ce9178;">"\\.\DISPLAY1"</span> <span style="color:#b5cea8;">60</span> <span style="color:#b5cea8;">17</span></code></pre>

<p><strong><code>switch-displayport.ps1</code></strong> &mdash; switch to the macbook:</p>

<pre><code><span style="color:#6b9955;"># switch-displayport.ps1 — switch monitor input to displayport (macbook)</span>
<span style="color:#9cdcfe;">$monitorTool</span> = <span style="color:#ce9178;">"D:\applications\ControlMyMonitor.exe"</span>

<span style="color:#6b9955;"># vcp code 60 = input source, value 15 = displayport</span>
&amp; <span style="color:#9cdcfe;">$monitorTool</span> /SetValue <span style="color:#ce9178;">"\\.\DISPLAY1"</span> <span style="color:#b5cea8;">60</span> <span style="color:#b5cea8;">15</span></code></pre>

<p><strong><code>get-display-input.ps1</code></strong> &mdash; check which input is currently active:</p>

<pre><code><span style="color:#6b9955;"># get-display-input.ps1 — read the current monitor input</span>
<span style="color:#9cdcfe;">$monitorTool</span> = <span style="color:#ce9178;">"D:\applications\ControlMyMonitor.exe"</span>

<span style="color:#6b9955;"># read vcp code 60 and output the raw value</span>
<span style="color:#9cdcfe;">$value</span> = &amp; <span style="color:#9cdcfe;">$monitorTool</span> /GetValue <span style="color:#ce9178;">"\\.\DISPLAY1"</span> <span style="color:#b5cea8;">60</span>
Write-Output <span style="color:#9cdcfe;">$value</span>.Trim()</code></pre>

<p>then on the web app side, a <code>DesktopService</code> calls these scripts via node's <code>child_process</code>:</p>

<pre><code><span style="color:#6b9955;">// desktop.service.ts — the relevant bits</span>
<span style="color:#569cd6;">const</span> <span style="color:#4fc1ff;">SWITCH_TO_HDMI</span> = <span style="color:#ce9178;">"D:\\applications\\switch-hdmi.ps1"</span>
<span style="color:#569cd6;">const</span> <span style="color:#4fc1ff;">SWITCH_TO_DP</span>   = <span style="color:#ce9178;">"D:\\applications\\switch-displayport.ps1"</span>

<span style="color:#569cd6;">async</span> <span style="color:#dcdcaa;">switchToHdmi</span>(): <span style="color:#4ec9b0;">Promise</span>&lt;<span style="color:#4ec9b0;">void</span>&gt; {
  <span style="color:#569cd6;">await</span> <span style="color:#dcdcaa;">execAsync</span>(
    <span style="color:#ce9178;">`powershell -ExecutionPolicy Bypass -File "${<span style="color:#4fc1ff;">SWITCH_TO_HDMI</span>}"`</span>
  )
}

<span style="color:#569cd6;">async</span> <span style="color:#dcdcaa;">switchToDisplayPort</span>(): <span style="color:#4ec9b0;">Promise</span>&lt;<span style="color:#4ec9b0;">void</span>&gt; {
  <span style="color:#569cd6;">await</span> <span style="color:#dcdcaa;">execAsync</span>(
    <span style="color:#ce9178;">`powershell -ExecutionPolicy Bypass -File "${<span style="color:#4fc1ff;">SWITCH_TO_DP</span>}"`</span>
  )
}</code></pre>

<p>and an api route exposes it to the frontend:</p>

<pre><code><span style="color:#6b9955;">// POST /api/desktop/kvm</span>
<span style="color:#569cd6;">const</span> { <span style="color:#9cdcfe;">target</span> } = <span style="color:#569cd6;">await</span> request.<span style="color:#dcdcaa;">json</span>()

<span style="color:#c586c0;">if</span> (<span style="color:#9cdcfe;">target</span> === <span style="color:#ce9178;">'hdmi'</span>) {
  <span style="color:#569cd6;">await</span> desktopService.<span style="color:#dcdcaa;">switchToHdmi</span>()
} <span style="color:#c586c0;">else</span> {
  <span style="color:#569cd6;">await</span> desktopService.<span style="color:#dcdcaa;">switchToDisplayPort</span>()
}</code></pre>

<p>here's how the full chain flows when i click the button:</p>

<pre><code>  ┌──────────────┐     ┌──────────────────┐     ┌─────────────────┐
  │  dashboard   │     │   next.js api    │     │   powershell    │
  │  button      │────▶│ /api/desktop/kvm │────▶│   script        │
  │  (browser)   │     │  (local server)  │     │   (windows)     │
  └──────────────┘     └──────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
                                                ┌─────────────────┐
                                                │ controlmymonitor│
                                                │ set vcp 60 = 17 │
                                                │    (or 15)      │
                                                └────────┬────────┘
                                                         │
                                                      ddc/ci
                                                         │
                                                         ▼
                                                ┌─────────────────┐
                                                │     monitor     │
                                                │  switches input │
                                                └─────────────────┘</code></pre>

<hr>

<h2>wiring it into the dashboard</h2>

<p>i already had a home dashboard (the site you're on right now) so i added two buttons to the top nav &mdash; one for hdmi, one for displayport. when i click one, it hits the <code>/api/desktop/kvm</code> endpoint, which calls the desktop service, which runs the powershell script. the monitor switches in about a second.</p>

<p>the active input gets highlighted so i always know which computer i'm looking at. when the dashboard detects it's running on the local windows server (via a health check), it shows the switch buttons. otherwise they're hidden &mdash; no point showing them on the production deployment.</p>

<hr>

<h2>the full switching workflow</h2>

<p>when i want to swap from one computer to the other, here's what happens:</p>

<ol>
<li><strong>click the switch button</strong> on the dashboard (works from any browser, even my phone)</li>
<li><strong>monitor switches input</strong> &mdash; takes about one second via ddc/ci</li>
<li><strong>press the mode button on the keyboard</strong> &mdash; flips from 2.4ghz to bluetooth (or back)</li>
<li><strong>press the mode button on the mouse</strong> &mdash; same deal</li>
</ol>

<p>total time: about <strong>three seconds</strong>. and i never have to reach behind the monitor or unplug anything.</p>

<hr>

<h2>why not just buy a kvm?</h2>

<blockquote><p>honestly? i didn't want more cables.</p></blockquote>

<p>a kvm switch means running both computers' video through the switch, plus usb for peripherals. that's at least <strong>four extra cables</strong> plus the switch itself. my solution uses <strong>zero additional hardware</strong> and <strong>zero additional cables</strong>. both video cables were already plugged in, and the peripherals are wireless.</p>

<p>plus it was a fun project. and now i can switch computers from my phone if i want to, since the dashboard works on any browser.</p>

<hr>

<h2>tl;dr</h2>

<p><strong>two computers, one monitor, no kvm.</strong> <code>ddc/ci</code> lets you change monitor inputs via software. powershell scripts + a web dashboard button = one-click display switching. mouse and keyboard toggle between 2.4ghz and bluetooth with a button press. it's not fancy but it works great.</p>$html$,
  'published',
  ARRAY['homelab', 'hardware', 'automation'],
  5,
  NOW()
);
