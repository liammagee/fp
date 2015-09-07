% Fierce Planet

# Getting Started

*Fierce Planet* is designed to be highly configurable. The examples show some of the "out-of-the-box" options. It is also possible to add functional hooks to "setup" and "run" actions, to customise agent, terrain, building and road behaviour.



## Basic usage

To include the default configuration of *Fierce Planet*, a page needs to add:

 - The *fp.css* style sheet
 - A reference to Require that loads the Fierce Planet *app* script
 - A *div* element with a *container* id.

```

<html>
    <head>
        <title>Fierce Planet</title>
        <link rel="stylesheet" type="text/css" href="/css/fp.css">
        <script data-main="/js/app" src="/js/require.js"></script>
    </head>
    <body>
        <div id="container"></div>
    </body>
</html>

```


[Open in a new window](examples/usage/basic.html)


<!--
Here's some math:

$f(x)=\sum_{n=0}^\infty\frac{f^{(n)}(a)}{n!}(x-a)^n$   

-->
