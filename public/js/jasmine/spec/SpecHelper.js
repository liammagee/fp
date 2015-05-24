beforeEach(function () {
  jasmine.addMatchers({
    toHaveAnEqualVector: function () {
      return {
        compare: function (actual, expected) {
          var vector = actual;

          // Adjust for slight Pythagorean rounding errors
          // Compare to 15 significant figures
          var sigFigures = 15;
          var pow = Math.pow(10, sigFigures);
          var vx = Math.round( vector.x * pow ) / pow;
          var vy = Math.round( vector.y * pow ) / pow;
          var vz = Math.round( vector.z * pow ) / pow;
          var ex = Math.round( expected.x * pow ) / pow;
          var ey = Math.round( expected.y * pow ) / pow;
          var ez = Math.round( expected.z * pow ) / pow;

          return {
            pass: vx === ex && vy === ey && vz === ez
          };
        }
      };
    }
  });
});
