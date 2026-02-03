//
//  PeteTrainWidgetsBundle.swift
//  PeteTrainWidgets
//
//  Created by Pete Brousalis on 1/5/26.
//

import WidgetKit
import SwiftUI

@main
struct PeteTrainWidgetsBundle: WidgetBundle {
    var body: some Widget {
        // Watch face complication showing workout progress
        PeteTrainComplication()
    }
}
